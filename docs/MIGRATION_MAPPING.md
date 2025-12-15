# Migration Mapping: Google Sheet → Database

## Overview

Tai lieu nay mo ta cach chuyen doi du lieu tu Google Sheet sang PostgreSQL database.

## Sheet Structure (Gia dinh)

Google Sheet thong thuong co cac tab sau:

| Tab | Muc dich |
|-----|----------|
| `Danh sach tai xe` | Master data tai xe |
| `Danh sach xe` | Master data xe |
| `Diem boc/do` | Master data tram |
| `Tuyen duong` | Master data tuyen |
| `Nhat ky chuyen` | Du lieu chuyen hang ngay |

---

## A. TAI XE (drivers)

### Sheet: `Danh sach tai xe`

| Sheet Column | DB Field | Type | Transform | Notes |
|--------------|----------|------|-----------|-------|
| Ma NV | `employeeCode` | String | TRIM, UPPER | **Unique key** - dung de dedupe |
| Ho ten | `name` | String | TRIM | |
| SDT | `phone` | String | Normalize phone | Bo dau, giu 10 so |
| So GPLX | `licenseNo` | String | TRIM, UPPER | |
| Hang GPLX | `licenseType` | String | TRIM, UPPER | B2, C, D, E... |
| Trang thai | `isActive` | Boolean | Parse | "Hoat dong" → true |

### Normalize Rules

```
employeeCode: TRIM → UPPER → "TX" + pad(number, 4)
  VD: "tx001" → "TX0001"
  VD: "1" → "TX0001"

phone: Remove all non-digits → Keep last 10 digits
  VD: "0912.345.678" → "0912345678"
  VD: "+84912345678" → "0912345678"

isActive:
  - "Hoat dong", "Active", "1", "true", "x" → true
  - Empty, "Nghi viec", "Inactive", "0" → false
```

---

## B. XE (vehicles)

### Sheet: `Danh sach xe`

| Sheet Column | DB Field | Type | Transform | Notes |
|--------------|----------|------|-----------|-------|
| Bien so | `plateNo` | String | Normalize plate | **Unique key** |
| Loai xe | `vehicleType` | String | TRIM | |
| Trong tai | `capacity` | Decimal | Parse number | Tan |
| Hang xe | `brand` | String | TRIM | |
| Doi xe | `model` | String | TRIM | |
| Nam SX | `year` | Int | Parse year | |
| Trang thai | `isActive` | Boolean | Parse | |

### Normalize Rules

```
plateNo: UPPER → Remove spaces/dots → Standard format
  VD: "51C-123.45" → "51C12345"
  VD: "51c 12345" → "51C12345"

capacity: Parse decimal
  VD: "10.5 tan" → 10.5
  VD: "10,500" → 10.5 (nhan dien dau phay VN)

vehicleType: Map common values
  - "Xe tai" → "XE_TAI"
  - "Xe ben" → "XE_BEN"
  - "Xe dau keo" → "XE_DAU_KEO"
```

---

## C. TRAM (stations)

### Sheet: `Diem boc/do`

| Sheet Column | DB Field | Type | Transform | Notes |
|--------------|----------|------|-----------|-------|
| Ma tram | `code` | String | TRIM, UPPER | **Unique key** |
| Ten tram | `name` | String | TRIM | |
| Loai | `type` | Enum | Map type | MINE/WAREHOUSE/PORT/FACTORY/OTHER |
| Dia chi | `address` | String | TRIM | |
| Trang thai | `isActive` | Boolean | Parse | |

### Normalize Rules

```
code: TRIM → UPPER
  VD: "mo1" → "MO1"

type: Map to enum
  - "Mo", "Mine" → MINE
  - "Kho", "Warehouse" → WAREHOUSE
  - "Cang", "Port" → PORT
  - "Nha may", "Factory" → FACTORY
  - Default → OTHER
```

---

## D. TUYEN (routes)

### Sheet: `Tuyen duong`

| Sheet Column | DB Field | Type | Transform | Notes |
|--------------|----------|------|-----------|-------|
| Ma tuyen | `code` | String | TRIM, UPPER | **Unique key** |
| Ten tuyen | `name` | String | TRIM | |
| Diem boc | `originId` | FK | Lookup station.code | |
| Diem do | `destinationId` | FK | Lookup station.code | |
| Khoang cach | `distance` | Decimal | Parse km | |
| Don gia/tan | `defaultRatePerTon` | Decimal | Parse VND | |
| Trang thai | `isActive` | Boolean | Parse | |

### Normalize Rules

```
originId/destinationId: Lookup by normalized station code
  Sheet value "MO1" → Find station where code = "MO1" → Use station.id

distance: Parse decimal
  VD: "50 km" → 50.0

defaultRatePerTon: Parse currency
  VD: "100,000" → 100000
  VD: "100.000 VND" → 100000
```

---

## E. CHUYEN (trips) - QUAN TRONG NHAT

### Sheet: `Nhat ky chuyen`

| Sheet Column | DB Field | Type | Transform | Notes |
|--------------|----------|------|-----------|-------|
| STT / Row ID | `_sheetRowId` | - | Keep for dedupe | Dung de track |
| Ma chuyen | `tripCode` | String | Generate if empty | Auto: TRP-YYYYMMDD-XXX |
| Ngay | `tripDate` | Date | Parse date | |
| Ma NV | `driverId` | FK | Lookup driver.employeeCode | |
| Bien so | `vehicleId` | FK | Lookup vehicle.plateNo | |
| Ma tuyen | `routeId` | FK | Lookup route.code | |
| Diem boc | `originId` | FK | Lookup station.code | |
| Diem do | `destinationId` | FK | Lookup station.code | |
| Gio xuat phat | `departureTime` | DateTime | Parse time | |
| Gio den | `arrivalTime` | DateTime | Parse time | |
| KL boc | `weightLoaded` | Decimal | Parse weight | Tan |
| KL do | `weightUnloaded` | Decimal | Parse weight | Tan |
| KL chot | `weightFinal` | Decimal | Parse weight | **QUAN TRONG** - dung tinh luong |
| Trang thai | `status` | Enum | Map status | |
| Ghi chu | `note` | String | TRIM | |

### Normalize Rules

```
tripDate: Parse various formats
  - "15/12/2024" → 2024-12-15
  - "2024-12-15" → 2024-12-15
  - "15-12-2024" → 2024-12-15
  - Excel serial → Convert to date

tripCode: Generate if empty
  Format: TRP-YYYYMMDD-XXX (XXX = sequence per day)

status: Map to enum
  - "Da duyet", "Approved", "OK", "Chot" → APPROVED
  - "Tu choi", "Rejected" → REJECTED
  - "Cho duyet", "Pending" → PENDING
  - "Nhap", "Draft", empty → DRAFT

weight: Parse decimal
  - "10.5" → 10.5
  - "10,5" → 10.5 (VN format)
  - "10.500" → 10.5 (VN thousand separator)

departureTime/arrivalTime: Combine with tripDate
  - tripDate = 2024-12-15, time = "08:30" → 2024-12-15T08:30:00
```

### Dedupe Key cho Trips

**Primary dedupe key:**
```
(tripDate, driverId, vehicleId, routeId, weightFinal)
```

**Hoac neu sheet co row ID:**
```
_sheetRowId (giu nguyen ID tu sheet de track)
```

---

## F. Import Order (BAT BUOC)

Import phai theo thu tu de dam bao FK constraints:

```
1. drivers     (no FK)
2. vehicles    (no FK)
3. stations    (no FK)
4. routes      (FK: stations)
5. trips       (FK: drivers, vehicles, routes, stations)
```

---

## G. Error Handling

### Invalid FK Reference

```
Neu sheet trip co "Ma NV = TX9999" nhung khong co trong drivers:
→ Log error, skip trip, continue
→ Report: "Row 123: Driver TX9999 not found"
```

### Invalid Data Format

```
Neu weightFinal = "abc" (khong parse duoc):
→ Log warning, set null, continue
→ Report: "Row 123: Invalid weight 'abc', set to null"
```

### Duplicate Detection

```
Neu trip da ton tai (theo dedupe key):
→ Skip (khong update)
→ Report: "Row 123: Duplicate trip, skipped"
```

---

## H. CSV Fallback Format

Neu khong dung Google Sheets API, export CSV voi format:

```csv
# drivers.csv
employeeCode,name,phone,licenseNo,licenseType,isActive
TX0001,Nguyen Van A,0912345678,B2-123456,C,true

# vehicles.csv
plateNo,vehicleType,capacity,brand,model,year,isActive
51C12345,XE_TAI,10.5,HYUNDAI,HD120,2020,true

# stations.csv
code,name,type,address,isActive
MO1,Mo Da Lat,MINE,Lam Dong,true

# routes.csv
code,name,originCode,destinationCode,distance,defaultRatePerTon,isActive
R001,Mo DaLat - Cang SG,MO1,CSG,300,100000,true

# trips.csv
sheetRowId,tripCode,tripDate,driverCode,vehiclePlate,routeCode,originCode,destinationCode,departureTime,arrivalTime,weightLoaded,weightUnloaded,weightFinal,status,note
1,,2024-12-15,TX0001,51C12345,R001,MO1,CSG,08:30,14:30,10.5,10.3,10.3,APPROVED,
```

---

## I. Checklist Truoc Khi Import

- [ ] Export sheet moi nhat
- [ ] Verify column headers khop voi mapping
- [ ] Check master data (drivers, vehicles, stations, routes) truoc
- [ ] Run dry-run de xem bao cao loi
- [ ] Fix loi trong sheet neu can
- [ ] Run apply de import
- [ ] Verify count trong DB = count trong sheet
- [ ] Test dashboard & salary calculation
