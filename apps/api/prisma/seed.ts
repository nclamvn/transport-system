import { PrismaClient, Role, StationType, TripStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  // Clean up existing data (in reverse order of dependencies)
  await prisma.auditLog.deleteMany();
  await prisma.salaryResult.deleteMany();
  await prisma.salaryPeriod.deleteMany();
  await prisma.salaryRule.deleteMany();
  await prisma.tripRecord.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.route.deleteMany();
  await prisma.station.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.user.deleteMany();

  console.log('✅ Cleaned up existing data');

  // Create Users
  const adminPassword = await bcrypt.hash('admin123', 10);
  const dispatcherPassword = await bcrypt.hash('dispatch123', 10);
  const hrPassword = await bcrypt.hash('hr123456', 10);
  const driverPassword = await bcrypt.hash('driver123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@transport.local',
      password: adminPassword,
      name: 'Admin User',
      phone: '0901234567',
      roles: [Role.ADMIN],
    },
  });

  const dispatcher = await prisma.user.create({
    data: {
      email: 'dispatcher@transport.local',
      password: dispatcherPassword,
      name: 'Nguyen Van Dieu',
      phone: '0902345678',
      roles: [Role.DISPATCHER],
    },
  });

  const hr = await prisma.user.create({
    data: {
      email: 'hr@transport.local',
      password: hrPassword,
      name: 'Tran Thi HR',
      phone: '0903456789',
      roles: [Role.HR],
    },
  });

  const driverUser1 = await prisma.user.create({
    data: {
      email: 'driver1@transport.local',
      password: driverPassword,
      name: 'Le Van Tai',
      phone: '0904567890',
      roles: [Role.DRIVER],
    },
  });

  const driverUser2 = await prisma.user.create({
    data: {
      email: 'driver2@transport.local',
      password: driverPassword,
      name: 'Pham Van Xe',
      phone: '0905678901',
      roles: [Role.DRIVER],
    },
  });

  console.log('✅ Created users');

  // Create Drivers (linked to driver users)
  const driver1 = await prisma.driver.create({
    data: {
      employeeCode: 'TX001',
      name: 'Le Van Tai',
      phone: '0904567890',
      licenseNo: 'B2-123456',
      licenseType: 'C',
      userId: driverUser1.id,
    },
  });

  const driver2 = await prisma.driver.create({
    data: {
      employeeCode: 'TX002',
      name: 'Pham Van Xe',
      phone: '0905678901',
      licenseNo: 'B2-234567',
      licenseType: 'D',
      userId: driverUser2.id,
    },
  });

  // Create a driver without user account
  const driver3 = await prisma.driver.create({
    data: {
      employeeCode: 'TX003',
      name: 'Hoang Van Ba',
      phone: '0906789012',
      licenseNo: 'B2-345678',
      licenseType: 'C',
    },
  });

  console.log('✅ Created drivers');

  // Create Vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      plateNo: '51C-12345',
      vehicleType: 'Xe ben',
      capacity: 15,
      brand: 'Hyundai',
      model: 'HD120',
      year: 2022,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      plateNo: '51C-23456',
      vehicleType: 'Xe ben',
      capacity: 18,
      brand: 'Hino',
      model: '500',
      year: 2023,
    },
  });

  const vehicle3 = await prisma.vehicle.create({
    data: {
      plateNo: '51C-34567',
      vehicleType: 'Xe dau keo',
      capacity: 30,
      brand: 'Volvo',
      model: 'FH16',
      year: 2021,
    },
  });

  console.log('✅ Created vehicles');

  // Create Stations
  const mine1 = await prisma.station.create({
    data: {
      code: 'MO-01',
      name: 'Mo Da Tan Uyen',
      type: StationType.MINE,
      address: 'Tan Uyen, Binh Duong',
      lat: 11.0123,
      lng: 106.7456,
    },
  });

  const mine2 = await prisma.station.create({
    data: {
      code: 'MO-02',
      name: 'Mo Cat Binh Duong',
      type: StationType.MINE,
      address: 'Phu Giao, Binh Duong',
      lat: 11.1234,
      lng: 106.8567,
    },
  });

  const warehouse1 = await prisma.station.create({
    data: {
      code: 'KHO-01',
      name: 'Kho VLXD Quan 9',
      type: StationType.WAREHOUSE,
      address: 'Quan 9, TP.HCM',
      lat: 10.8234,
      lng: 106.8123,
    },
  });

  const factory1 = await prisma.station.create({
    data: {
      code: 'NM-01',
      name: 'Nha may Be tong A',
      type: StationType.FACTORY,
      address: 'Thu Duc, TP.HCM',
      lat: 10.8456,
      lng: 106.7567,
    },
  });

  const port1 = await prisma.station.create({
    data: {
      code: 'CANG-01',
      name: 'Cang Cat Lai',
      type: StationType.PORT,
      address: 'Quan 2, TP.HCM',
      lat: 10.7456,
      lng: 106.7890,
    },
  });

  console.log('✅ Created stations');

  // Create Routes
  const route1 = await prisma.route.create({
    data: {
      code: 'TU-01',
      name: 'Mo Tan Uyen - Kho Q9',
      originId: mine1.id,
      destinationId: warehouse1.id,
      distance: 35,
      defaultRatePerTon: 50000,
    },
  });

  const route2 = await prisma.route.create({
    data: {
      code: 'TU-02',
      name: 'Mo Tan Uyen - NM Be tong',
      originId: mine1.id,
      destinationId: factory1.id,
      distance: 40,
      defaultRatePerTon: 55000,
    },
  });

  const route3 = await prisma.route.create({
    data: {
      code: 'BD-01',
      name: 'Mo Cat BD - Cang Cat Lai',
      originId: mine2.id,
      destinationId: port1.id,
      distance: 50,
      defaultRatePerTon: 65000,
    },
  });

  console.log('✅ Created routes');

  // Create sample Trips
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const trip1 = await prisma.trip.create({
    data: {
      tripCode: 'TR241215-ABC1',
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      routeId: route1.id,
      originId: mine1.id,
      destinationId: warehouse1.id,
      tripDate: yesterday,
      departureTime: new Date(yesterday.setHours(7, 30)),
      arrivalTime: new Date(yesterday.setHours(9, 15)),
      weightLoaded: 14.5,
      weightUnloaded: 14.2,
      weightFinal: 14.2,
      status: TripStatus.APPROVED,
    },
  });

  const trip2 = await prisma.trip.create({
    data: {
      tripCode: 'TR241215-ABC2',
      driverId: driver1.id,
      vehicleId: vehicle1.id,
      routeId: route1.id,
      originId: mine1.id,
      destinationId: warehouse1.id,
      tripDate: today,
      departureTime: new Date(today.setHours(8, 0)),
      weightLoaded: 15.0,
      status: TripStatus.PENDING,
      note: 'Chuyen sang 2',
    },
  });

  const trip3 = await prisma.trip.create({
    data: {
      tripCode: 'TR241215-ABC3',
      driverId: driver2.id,
      vehicleId: vehicle2.id,
      routeId: route2.id,
      originId: mine1.id,
      destinationId: factory1.id,
      tripDate: today,
      weightLoaded: 17.8,
      status: TripStatus.DRAFT,
    },
  });

  console.log('✅ Created sample trips');

  // Create Salary Rules
  const salaryRule1 = await prisma.salaryRule.create({
    data: {
      name: 'Don gia tuyen Mo Tan Uyen - Kho Q9',
      description: 'Don gia tinh luong theo tan cho tuyen TU-01',
      version: 1,
      effectiveFrom: new Date('2024-01-01'),
      ruleType: 'PER_TON',
      routeId: route1.id,
      rateAmount: 50000,
      conditions: { minWeight: 0 },
    },
  });

  const salaryRule2 = await prisma.salaryRule.create({
    data: {
      name: 'Don gia tuyen Mo Tan Uyen - NM Be tong',
      description: 'Don gia tinh luong theo tan cho tuyen TU-02',
      version: 1,
      effectiveFrom: new Date('2024-01-01'),
      ruleType: 'PER_TON',
      routeId: route2.id,
      rateAmount: 55000,
      conditions: { minWeight: 0 },
    },
  });

  const salaryRule3 = await prisma.salaryRule.create({
    data: {
      name: 'Phu cap an trua',
      description: 'Phu cap an trua cho tai xe',
      version: 1,
      effectiveFrom: new Date('2024-01-01'),
      ruleType: 'ALLOWANCE',
      rateAmount: 50000,
      conditions: { perDay: true },
    },
  });

  console.log('✅ Created salary rules');

  // Create Salary Period
  const salaryPeriod = await prisma.salaryPeriod.create({
    data: {
      code: '2024-12-P1',
      name: 'Ky 1 thang 12/2024',
      periodStart: new Date('2024-12-01'),
      periodEnd: new Date('2024-12-15'),
      status: 'OPEN',
    },
  });

  console.log('✅ Created salary period');

  // Create audit log for seed
  await prisma.auditLog.create({
    data: {
      entity: 'system',
      entityId: 'seed',
      action: 'CREATE',
      after: { message: 'Database seeded successfully' },
      userId: admin.id,
      userEmail: admin.email,
    },
  });

  console.log('✅ Created audit log');

  console.log('\n🎉 Seed completed successfully!');
  console.log('\n📋 Test accounts:');
  console.log('  Admin: admin@transport.local / admin123');
  console.log('  Dispatcher: dispatcher@transport.local / dispatch123');
  console.log('  HR: hr@transport.local / hr123456');
  console.log('  Driver 1: driver1@transport.local / driver123');
  console.log('  Driver 2: driver2@transport.local / driver123');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
