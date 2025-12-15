# Transport System

He thong quan ly van tai noi bo - Quan ly chuyen xe, khoi luong hang, tinh luong tai xe.

## Tinh nang chinh

- **Quan ly chuyen xe**: Tao, duyet, tu choi chuyen van tai
- **Tinh luong tu dong**: Cong thuc luong theo trong tai, tuyen duong, thuong/phat
- **Phan quyen vai tro**: ADMIN, HR, DISPATCHER, DRIVER
- **Dashboard bao cao**: Thong ke doanh thu, chuyen xe, tai xe
- **Audit log**: Ghi nhan moi thao tac he thong

## Cong nghe su dung

| Layer | Technology |
|-------|-----------|
| Backend | NestJS 10, TypeScript |
| Database | PostgreSQL 14, Prisma ORM |
| Frontend | Next.js 14 (App Router), TailwindCSS |
| Auth | JWT + RBAC |

## Cau truc thu muc

```
transport-system/
├── apps/
│   ├── api/              # NestJS backend
│   │   ├── prisma/       # Schema & migrations
│   │   ├── src/
│   │   │   ├── auth/     # JWT authentication
│   │   │   ├── trips/    # Trip management
│   │   │   ├── salary/   # Salary calculation
│   │   │   ├── analytics/# Dashboard & reports
│   │   │   └── ...
│   │   └── scripts/      # Migration scripts
│   └── web/              # Next.js frontend
│       └── src/app/
│           ├── login/
│           ├── dashboard/
│           ├── driver/   # Driver mobile UI
│           ├── review/   # Trip review (HR/Admin)
│           └── hr/       # Salary management
└── docs/                 # Documentation
    ├── MIGRATION_MAPPING.md
    ├── PARALLEL_RUN.md
    └── GO_LIVE_RUNBOOK.md
```

## Cai dat

### Yeu cau he thong

- Node.js >= 18
- PostgreSQL 14+
- Docker (optional)

### 1. Clone repository

```bash
git clone <repo-url>
cd transport-system
```

### 2. Cai dat dependencies

```bash
# API
cd apps/api
npm install

# Web
cd ../web
npm install
```

### 3. Cau hinh environment

```bash
# API
cp apps/api/.env.example apps/api/.env
# Chinh sua DATABASE_URL, JWT_SECRET

# Web
cp apps/web/.env.example apps/web/.env
```

### 4. Khoi tao database

**Option A: Docker (khuyen nghi)**
```bash
docker run -d --name transport-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=password \
  -e POSTGRES_DB=transport_system \
  -p 5432:5432 \
  postgres:14
```

**Option B: Local PostgreSQL**
```bash
createdb transport_system
```

**Chay migrations & seed:**
```bash
cd apps/api

# Chay migrations
npx prisma migrate deploy

# Seed du lieu mau
npx prisma db seed
```

### 5. Chay ung dung

```bash
# Terminal 1 - API (port 4000)
cd apps/api
npm run start:dev

# Terminal 2 - Web (port 4001)
cd apps/web
npm run dev
```

Truy cap:
- Web: http://localhost:4001
- API: http://localhost:4000/api

## Tai khoan test

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@transport.local | admin123 |
| HR | hr@transport.local | hr123456 |
| Dispatcher | dispatcher@transport.local | dispatch123 |
| Driver 1 | driver1@transport.local | driver123 |
| Driver 2 | driver2@transport.local | driver123 |

## Docker Deployment

```bash
# Khoi dong tat ca services
docker-compose up -d

# Xem logs
docker-compose logs -f
```

## API Endpoints

### Authentication
- `POST /api/auth/login` - Dang nhap
- `GET /api/auth/profile` - Thong tin user hien tai

### Trips
- `GET /api/trips` - Danh sach chuyen (HR/Admin)
- `POST /api/trips` - Tao chuyen moi
- `POST /api/trips/:id/approve` - Duyet chuyen
- `POST /api/trips/:id/reject` - Tu choi chuyen
- `GET /api/driver/trips` - Chuyen cua tai xe

### Salary
- `GET /api/salary/periods` - Danh sach ky luong
- `POST /api/salary/periods` - Tao ky luong moi
- `POST /api/salary/periods/:id/calculate` - Tinh luong
- `POST /api/salary/periods/:id/lock` - Khoa ky luong

### Analytics
- `GET /api/analytics/dashboard` - Dashboard tong quan
- `GET /api/analytics/driver-stats` - Thong ke tai xe

## Roles & Permissions

| Permission | ADMIN | HR | DISPATCHER | DRIVER |
|------------|-------|-----|------------|--------|
| Quan ly Users | V | | | |
| Quan ly Drivers | V | V | | |
| Quan ly Vehicles | V | | V | |
| Xem tat ca Trips | V | V | V | |
| Tao Trip | V | V | | V |
| Duyet/Tu choi Trip | V | | V | |
| Tinh luong | V | V | | |
| Xem Audit Logs | V | V | | |

## Phat trien

```bash
# Chay tests
cd apps/api
npm run test

# Lint
npm run lint

# Format
npm run format
```

## License

Private - All rights reserved
