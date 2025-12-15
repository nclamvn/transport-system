/**
 * Import Script: Google Sheet / CSV → Database
 *
 * Usage:
 *   npx ts-node scripts/import_from_sheets.ts --dry-run --source=csv --dir=./data
 *   npx ts-node scripts/import_from_sheets.ts --apply --source=csv --dir=./data
 *   npx ts-node scripts/import_from_sheets.ts --apply --source=sheets --spreadsheet-id=XXX
 *
 * Options:
 *   --dry-run       Report only, no DB writes
 *   --apply         Actually write to DB
 *   --source=csv    Read from CSV files (default)
 *   --source=sheets Read from Google Sheets API
 *   --dir=PATH      Directory containing CSV files (for source=csv)
 *   --spreadsheet-id=ID  Google Spreadsheet ID (for source=sheets)
 *   --skip-drivers  Skip drivers import
 *   --skip-vehicles Skip vehicles import
 *   --skip-stations Skip stations import
 *   --skip-routes   Skip routes import
 *   --skip-trips    Skip trips import
 */

import { PrismaClient, StationType, TripStatus } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// ==================== CONFIG ====================

interface ImportConfig {
  dryRun: boolean;
  source: 'csv' | 'sheets';
  csvDir: string;
  spreadsheetId?: string;
  skipDrivers: boolean;
  skipVehicles: boolean;
  skipStations: boolean;
  skipRoutes: boolean;
  skipTrips: boolean;
}

interface ImportStats {
  entity: string;
  total: number;
  imported: number;
  skipped: number;
  errors: number;
}

interface ImportError {
  entity: string;
  row: number;
  field?: string;
  value?: string;
  message: string;
}

// ==================== PARSE ARGS ====================

function parseArgs(): ImportConfig {
  const args = process.argv.slice(2);

  const config: ImportConfig = {
    dryRun: true,
    source: 'csv',
    csvDir: './data',
    skipDrivers: false,
    skipVehicles: false,
    skipStations: false,
    skipRoutes: false,
    skipTrips: false,
  };

  for (const arg of args) {
    if (arg === '--dry-run') {
      config.dryRun = true;
    } else if (arg === '--apply') {
      config.dryRun = false;
    } else if (arg.startsWith('--source=')) {
      config.source = arg.split('=')[1] as 'csv' | 'sheets';
    } else if (arg.startsWith('--dir=')) {
      config.csvDir = arg.split('=')[1];
    } else if (arg.startsWith('--spreadsheet-id=')) {
      config.spreadsheetId = arg.split('=')[1];
    } else if (arg === '--skip-drivers') {
      config.skipDrivers = true;
    } else if (arg === '--skip-vehicles') {
      config.skipVehicles = true;
    } else if (arg === '--skip-stations') {
      config.skipStations = true;
    } else if (arg === '--skip-routes') {
      config.skipRoutes = true;
    } else if (arg === '--skip-trips') {
      config.skipTrips = true;
    }
  }

  return config;
}

// ==================== CSV PARSER ====================

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  // Parse header
  const headers = parseCSVLine(lines[0]);

  // Parse data rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      row[headers[j]] = values[j] || '';
    }
    row._rowNumber = String(i + 1);
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

// ==================== NORMALIZERS ====================

function normalizeEmployeeCode(value: string): string {
  const trimmed = value.trim().toUpperCase();
  // If already has TX prefix, return as is
  if (trimmed.startsWith('TX')) {
    return trimmed;
  }
  // If just a number, pad and add TX
  const num = parseInt(trimmed, 10);
  if (!isNaN(num)) {
    return `TX${String(num).padStart(4, '0')}`;
  }
  return trimmed;
}

function normalizePhone(value: string): string {
  // Remove all non-digits
  const digits = value.replace(/\D/g, '');
  // Keep last 10 digits
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

function normalizePlateNo(value: string): string {
  // Remove spaces, dots, dashes and uppercase
  return value.replace(/[\s.\-]/g, '').toUpperCase();
}

function normalizeStationCode(value: string): string {
  return value.trim().toUpperCase();
}

function normalizeRouteCode(value: string): string {
  return value.trim().toUpperCase();
}

function parseBoolean(value: string): boolean {
  const lower = value.toLowerCase().trim();
  return ['true', '1', 'x', 'hoat dong', 'active', 'yes', 'co'].includes(lower);
}

function parseDecimal(value: string): number | null {
  if (!value || value.trim() === '') return null;

  // Remove non-numeric except . and ,
  let cleaned = value.replace(/[^\d.,\-]/g, '');

  // Handle Vietnamese format (10.500 = 10500, 10,5 = 10.5)
  // If has both . and , -> . is thousand separator, , is decimal
  if (cleaned.includes('.') && cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  }
  // If only , -> check position to determine format
  else if (cleaned.includes(',')) {
    const commaPos = cleaned.indexOf(',');
    const afterComma = cleaned.length - commaPos - 1;
    if (afterComma <= 2) {
      // Decimal separator
      cleaned = cleaned.replace(',', '.');
    } else {
      // Thousand separator
      cleaned = cleaned.replace(',', '');
    }
  }
  // If only . -> check position
  else if (cleaned.includes('.')) {
    const dotPos = cleaned.indexOf('.');
    const afterDot = cleaned.length - dotPos - 1;
    if (afterDot > 2) {
      // Thousand separator
      cleaned = cleaned.replace('.', '');
    }
  }

  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function parseDate(value: string): Date | null {
  if (!value || value.trim() === '') return null;

  const trimmed = value.trim();

  // Try DD/MM/YYYY
  const ddmmyyyy = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (ddmmyyyy) {
    return new Date(
      parseInt(ddmmyyyy[3]),
      parseInt(ddmmyyyy[2]) - 1,
      parseInt(ddmmyyyy[1]),
    );
  }

  // Try DD-MM-YYYY
  const ddmmyyyyDash = trimmed.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (ddmmyyyyDash) {
    return new Date(
      parseInt(ddmmyyyyDash[3]),
      parseInt(ddmmyyyyDash[2]) - 1,
      parseInt(ddmmyyyyDash[1]),
    );
  }

  // Try YYYY-MM-DD (ISO)
  const iso = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (iso) {
    return new Date(parseInt(iso[1]), parseInt(iso[2]) - 1, parseInt(iso[3]));
  }

  // Try Excel serial number
  const serial = parseFloat(trimmed);
  if (!isNaN(serial) && serial > 40000 && serial < 60000) {
    // Excel serial date (days since 1900-01-01)
    const excelEpoch = new Date(1899, 11, 30);
    return new Date(excelEpoch.getTime() + serial * 24 * 60 * 60 * 1000);
  }

  // Fallback to Date.parse
  const parsed = new Date(trimmed);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function parseTime(dateValue: Date, timeStr: string): Date | null {
  if (!timeStr || timeStr.trim() === '') return null;

  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match) {
    const result = new Date(dateValue);
    result.setHours(parseInt(match[1]), parseInt(match[2]), parseInt(match[3] || '0'));
    return result;
  }

  return null;
}

function mapStationType(value: string): StationType {
  const lower = value.toLowerCase().trim();
  if (lower.includes('mo') || lower.includes('mine')) return 'MINE';
  if (lower.includes('kho') || lower.includes('warehouse')) return 'WAREHOUSE';
  if (lower.includes('cang') || lower.includes('port')) return 'PORT';
  if (lower.includes('nha may') || lower.includes('factory')) return 'FACTORY';
  return 'OTHER';
}

function mapTripStatus(value: string): TripStatus {
  const lower = value.toLowerCase().trim();
  if (
    lower.includes('duyet') ||
    lower.includes('approved') ||
    lower === 'ok' ||
    lower.includes('chot')
  ) {
    return 'APPROVED';
  }
  if (lower.includes('tu choi') || lower.includes('rejected')) {
    return 'REJECTED';
  }
  if (lower.includes('cho') || lower.includes('pending')) {
    return 'PENDING';
  }
  return 'DRAFT';
}

// ==================== IMPORT FUNCTIONS ====================

const errors: ImportError[] = [];
const stats: ImportStats[] = [];

function addError(
  entity: string,
  row: number,
  message: string,
  field?: string,
  value?: string,
) {
  errors.push({ entity, row, field, value, message });
}

async function importDrivers(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  dryRun: boolean,
): Promise<ImportStats> {
  const stat: ImportStats = {
    entity: 'drivers',
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    const rowNum = parseInt(row._rowNumber || '0');

    try {
      const employeeCode = normalizeEmployeeCode(
        row.employeeCode || row['Ma NV'] || row.maNV || '',
      );
      if (!employeeCode) {
        addError('drivers', rowNum, 'Missing employeeCode');
        stat.errors++;
        continue;
      }

      const name = (row.name || row['Ho ten'] || row.hoTen || '').trim();
      if (!name) {
        addError('drivers', rowNum, 'Missing name', 'name');
        stat.errors++;
        continue;
      }

      // Check if exists
      const existing = await prisma.driver.findUnique({
        where: { employeeCode },
      });

      if (existing) {
        stat.skipped++;
        continue;
      }

      const data = {
        employeeCode,
        name,
        phone: normalizePhone(row.phone || row.SDT || row.sdt || ''),
        licenseNo: (row.licenseNo || row['So GPLX'] || row.soGPLX || '').trim().toUpperCase(),
        licenseType: (row.licenseType || row['Hang GPLX'] || row.hangGPLX || '').trim().toUpperCase(),
        isActive: parseBoolean(row.isActive || row['Trang thai'] || row.trangThai || 'true'),
      };

      if (!dryRun) {
        await prisma.driver.create({ data });
      }
      stat.imported++;
    } catch (err) {
      addError('drivers', rowNum, err instanceof Error ? err.message : 'Unknown error');
      stat.errors++;
    }
  }

  return stat;
}

async function importVehicles(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  dryRun: boolean,
): Promise<ImportStats> {
  const stat: ImportStats = {
    entity: 'vehicles',
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    const rowNum = parseInt(row._rowNumber || '0');

    try {
      const plateNo = normalizePlateNo(
        row.plateNo || row['Bien so'] || row.bienSo || '',
      );
      if (!plateNo) {
        addError('vehicles', rowNum, 'Missing plateNo');
        stat.errors++;
        continue;
      }

      const existing = await prisma.vehicle.findUnique({
        where: { plateNo },
      });

      if (existing) {
        stat.skipped++;
        continue;
      }

      const data = {
        plateNo,
        vehicleType: (row.vehicleType || row['Loai xe'] || row.loaiXe || 'XE_TAI').trim(),
        capacity: parseDecimal(row.capacity || row['Trong tai'] || row.trongTai || ''),
        brand: (row.brand || row['Hang xe'] || row.hangXe || '').trim() || null,
        model: (row.model || row['Doi xe'] || row.doiXe || '').trim() || null,
        year: parseInt(row.year || row['Nam SX'] || row.namSX || '0') || null,
        isActive: parseBoolean(row.isActive || row['Trang thai'] || row.trangThai || 'true'),
      };

      if (!dryRun) {
        await prisma.vehicle.create({ data });
      }
      stat.imported++;
    } catch (err) {
      addError('vehicles', rowNum, err instanceof Error ? err.message : 'Unknown error');
      stat.errors++;
    }
  }

  return stat;
}

async function importStations(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  dryRun: boolean,
): Promise<ImportStats> {
  const stat: ImportStats = {
    entity: 'stations',
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  for (const row of rows) {
    const rowNum = parseInt(row._rowNumber || '0');

    try {
      const code = normalizeStationCode(
        row.code || row['Ma tram'] || row.maTram || '',
      );
      if (!code) {
        addError('stations', rowNum, 'Missing code');
        stat.errors++;
        continue;
      }

      const existing = await prisma.station.findUnique({
        where: { code },
      });

      if (existing) {
        stat.skipped++;
        continue;
      }

      const name = (row.name || row['Ten tram'] || row.tenTram || '').trim();
      if (!name) {
        addError('stations', rowNum, 'Missing name', 'name');
        stat.errors++;
        continue;
      }

      const data = {
        code,
        name,
        type: mapStationType(row.type || row['Loai'] || row.loai || ''),
        address: (row.address || row['Dia chi'] || row.diaChi || '').trim() || null,
        isActive: parseBoolean(row.isActive || row['Trang thai'] || row.trangThai || 'true'),
      };

      if (!dryRun) {
        await prisma.station.create({ data });
      }
      stat.imported++;
    } catch (err) {
      addError('stations', rowNum, err instanceof Error ? err.message : 'Unknown error');
      stat.errors++;
    }
  }

  return stat;
}

async function importRoutes(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  dryRun: boolean,
): Promise<ImportStats> {
  const stat: ImportStats = {
    entity: 'routes',
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  // Cache stations for lookup
  const stations = await prisma.station.findMany();
  const stationByCode = new Map(stations.map((s) => [s.code, s]));

  for (const row of rows) {
    const rowNum = parseInt(row._rowNumber || '0');

    try {
      const code = normalizeRouteCode(
        row.code || row['Ma tuyen'] || row.maTuyen || '',
      );
      if (!code) {
        addError('routes', rowNum, 'Missing code');
        stat.errors++;
        continue;
      }

      const existing = await prisma.route.findUnique({
        where: { code },
      });

      if (existing) {
        stat.skipped++;
        continue;
      }

      const originCode = normalizeStationCode(
        row.originCode || row['Diem boc'] || row.diemBoc || '',
      );
      const destCode = normalizeStationCode(
        row.destinationCode || row['Diem do'] || row.diemDo || '',
      );

      const origin = stationByCode.get(originCode);
      const dest = stationByCode.get(destCode);

      if (!origin) {
        addError('routes', rowNum, `Origin station not found: ${originCode}`, 'originCode', originCode);
        stat.errors++;
        continue;
      }

      if (!dest) {
        addError('routes', rowNum, `Destination station not found: ${destCode}`, 'destinationCode', destCode);
        stat.errors++;
        continue;
      }

      const name = (row.name || row['Ten tuyen'] || row.tenTuyen || '').trim();

      const data = {
        code,
        name: name || `${origin.name} - ${dest.name}`,
        originId: origin.id,
        destinationId: dest.id,
        distance: parseDecimal(row.distance || row['Khoang cach'] || row.khoangCach || ''),
        defaultRatePerTon: parseDecimal(row.defaultRatePerTon || row['Don gia/tan'] || row.donGia || ''),
        isActive: parseBoolean(row.isActive || row['Trang thai'] || row.trangThai || 'true'),
      };

      if (!dryRun) {
        await prisma.route.create({ data });
      }
      stat.imported++;
    } catch (err) {
      addError('routes', rowNum, err instanceof Error ? err.message : 'Unknown error');
      stat.errors++;
    }
  }

  return stat;
}

async function importTrips(
  prisma: PrismaClient,
  rows: Record<string, string>[],
  dryRun: boolean,
): Promise<ImportStats> {
  const stat: ImportStats = {
    entity: 'trips',
    total: rows.length,
    imported: 0,
    skipped: 0,
    errors: 0,
  };

  // Cache for lookups
  const drivers = await prisma.driver.findMany();
  const vehicles = await prisma.vehicle.findMany();
  const stations = await prisma.station.findMany();
  const routes = await prisma.route.findMany();

  const driverByCode = new Map(drivers.map((d) => [d.employeeCode, d]));
  const vehicleByPlate = new Map(vehicles.map((v) => [v.plateNo, v]));
  const stationByCode = new Map(stations.map((s) => [s.code, s]));
  const routeByCode = new Map(routes.map((r) => [r.code, r]));

  // Track generated trip codes per day
  const tripCodeCounters = new Map<string, number>();

  for (const row of rows) {
    const rowNum = parseInt(row._rowNumber || '0');

    try {
      // Parse date first (required)
      const tripDate = parseDate(row.tripDate || row['Ngay'] || row.ngay || '');
      if (!tripDate) {
        addError('trips', rowNum, 'Invalid or missing tripDate', 'tripDate', row.tripDate || row['Ngay']);
        stat.errors++;
        continue;
      }

      // Lookup driver
      const driverCode = normalizeEmployeeCode(
        row.driverCode || row['Ma NV'] || row.maNV || '',
      );
      const driver = driverByCode.get(driverCode);
      if (!driver) {
        addError('trips', rowNum, `Driver not found: ${driverCode}`, 'driverCode', driverCode);
        stat.errors++;
        continue;
      }

      // Lookup vehicle
      const vehiclePlate = normalizePlateNo(
        row.vehiclePlate || row['Bien so'] || row.bienSo || '',
      );
      const vehicle = vehicleByPlate.get(vehiclePlate);
      if (!vehicle) {
        addError('trips', rowNum, `Vehicle not found: ${vehiclePlate}`, 'vehiclePlate', vehiclePlate);
        stat.errors++;
        continue;
      }

      // Lookup route
      const routeCode = normalizeRouteCode(
        row.routeCode || row['Ma tuyen'] || row.maTuyen || '',
      );
      const route = routeByCode.get(routeCode);
      if (!route) {
        addError('trips', rowNum, `Route not found: ${routeCode}`, 'routeCode', routeCode);
        stat.errors++;
        continue;
      }

      // Lookup origin/destination (default from route)
      const originCode = normalizeStationCode(
        row.originCode || row['Diem boc'] || row.diemBoc || '',
      );
      const destCode = normalizeStationCode(
        row.destinationCode || row['Diem do'] || row.diemDo || '',
      );

      const origin = originCode ? stationByCode.get(originCode) : null;
      const dest = destCode ? stationByCode.get(destCode) : null;

      // Parse weights
      const weightLoaded = parseDecimal(row.weightLoaded || row['KL boc'] || row.klBoc || '');
      const weightUnloaded = parseDecimal(row.weightUnloaded || row['KL do'] || row.klDo || '');
      const weightFinal = parseDecimal(row.weightFinal || row['KL chot'] || row.klChot || '');

      // Generate or use trip code
      let tripCode = (row.tripCode || row['Ma chuyen'] || row.maChuyen || '').trim();
      if (!tripCode) {
        const dateKey = tripDate.toISOString().split('T')[0].replace(/-/g, '');
        const counter = (tripCodeCounters.get(dateKey) || 0) + 1;
        tripCodeCounters.set(dateKey, counter);
        tripCode = `TRP-${dateKey}-${String(counter).padStart(3, '0')}`;
      }

      // Check for duplicate by trip code
      const existingByCode = await prisma.trip.findUnique({
        where: { tripCode },
      });

      if (existingByCode) {
        stat.skipped++;
        continue;
      }

      // Additional dedupe by (date + driver + vehicle + route + weightFinal)
      const existingByKey = await prisma.trip.findFirst({
        where: {
          tripDate,
          driverId: driver.id,
          vehicleId: vehicle.id,
          routeId: route.id,
          weightFinal: weightFinal,
          deletedAt: null,
        },
      });

      if (existingByKey) {
        stat.skipped++;
        continue;
      }

      const data = {
        tripCode,
        tripDate,
        driverId: driver.id,
        vehicleId: vehicle.id,
        routeId: route.id,
        originId: origin?.id || route.originId,
        destinationId: dest?.id || route.destinationId,
        departureTime: parseTime(tripDate, row.departureTime || row['Gio xuat phat'] || row.gioXuatPhat || ''),
        arrivalTime: parseTime(tripDate, row.arrivalTime || row['Gio den'] || row.gioDen || ''),
        weightLoaded,
        weightUnloaded,
        weightFinal,
        status: mapTripStatus(row.status || row['Trang thai'] || row.trangThai || ''),
        note: (row.note || row['Ghi chu'] || row.ghiChu || '').trim() || null,
      };

      if (!dryRun) {
        await prisma.trip.create({ data });
      }
      stat.imported++;
    } catch (err) {
      addError('trips', rowNum, err instanceof Error ? err.message : 'Unknown error');
      stat.errors++;
    }
  }

  return stat;
}

// ==================== MAIN ====================

async function main() {
  const config = parseArgs();

  console.log('='.repeat(60));
  console.log('IMPORT FROM SHEETS/CSV');
  console.log('='.repeat(60));
  console.log(`Mode: ${config.dryRun ? 'DRY-RUN (no DB writes)' : 'APPLY (writing to DB)'}`);
  console.log(`Source: ${config.source}`);
  if (config.source === 'csv') {
    console.log(`CSV Dir: ${config.csvDir}`);
  }
  console.log('');

  // Validate source
  if (config.source === 'sheets') {
    console.log('Google Sheets API not implemented yet. Use CSV fallback.');
    console.log('Export your sheets as CSV and use --source=csv --dir=PATH');
    process.exit(1);
  }

  // Check CSV directory
  const csvDir = path.resolve(config.csvDir);
  if (!fs.existsSync(csvDir)) {
    console.error(`Error: CSV directory not found: ${csvDir}`);
    process.exit(1);
  }

  // Initialize Prisma
  const prisma = new PrismaClient();

  try {
    // Import in order
    const importOrder = [
      { file: 'drivers.csv', fn: importDrivers, skip: config.skipDrivers },
      { file: 'vehicles.csv', fn: importVehicles, skip: config.skipVehicles },
      { file: 'stations.csv', fn: importStations, skip: config.skipStations },
      { file: 'routes.csv', fn: importRoutes, skip: config.skipRoutes },
      { file: 'trips.csv', fn: importTrips, skip: config.skipTrips },
    ];

    for (const { file, fn, skip } of importOrder) {
      if (skip) {
        console.log(`Skipping ${file}`);
        continue;
      }

      const filePath = path.join(csvDir, file);
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${file} (skipping)`);
        continue;
      }

      console.log(`\nProcessing ${file}...`);
      const content = fs.readFileSync(filePath, 'utf-8');
      const rows = parseCSV(content);
      console.log(`  Found ${rows.length} rows`);

      const stat = await fn(prisma, rows, config.dryRun);
      stats.push(stat);

      console.log(`  Imported: ${stat.imported}`);
      console.log(`  Skipped (duplicate): ${stat.skipped}`);
      console.log(`  Errors: ${stat.errors}`);
    }

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log('');

    console.log('Statistics:');
    console.log('-'.repeat(50));
    for (const s of stats) {
      console.log(`  ${s.entity.padEnd(12)} Total: ${s.total}, Imported: ${s.imported}, Skipped: ${s.skipped}, Errors: ${s.errors}`);
    }

    if (errors.length > 0) {
      console.log('\nErrors:');
      console.log('-'.repeat(50));
      for (const e of errors) {
        console.log(`  [${e.entity}] Row ${e.row}: ${e.message}`);
        if (e.field) console.log(`    Field: ${e.field}, Value: ${e.value}`);
      }

      // Write error log
      const logPath = path.join(csvDir, 'import_errors.log');
      fs.writeFileSync(
        logPath,
        JSON.stringify({ timestamp: new Date().toISOString(), errors }, null, 2),
      );
      console.log(`\nError log written to: ${logPath}`);
    }

    console.log('\n' + '='.repeat(60));
    if (config.dryRun) {
      console.log('DRY-RUN complete. No changes made to database.');
      console.log('To apply changes, run with --apply flag.');
    } else {
      console.log('IMPORT complete. Changes applied to database.');
    }
    console.log('='.repeat(60));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
