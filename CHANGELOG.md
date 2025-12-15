# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2024-12-15

### Added - MVP Release

#### STEP 1: Database Schema & Auth
- PostgreSQL database with Prisma ORM
- Core entities: User, Driver, Vehicle, Station, Route, Trip
- JWT authentication with role-based access control (RBAC)
- Roles: ADMIN, DISPATCHER, HR, DRIVER
- Audit logging for all entity changes

#### STEP 2: Driver Mobile Web
- Next.js 14 App Router frontend
- Driver trip list view with status badges
- Create new trip form with route/vehicle selection
- View trip details
- Submit trip for review workflow

#### STEP 3: Trip Approval Workflow
- HR/Admin trip review interface
- Bulk approve/reject functionality
- Trip status flow: DRAFT -> PENDING -> APPROVED/REJECTED
- Exception handling for special cases
- Trip filtering by status, date, driver

#### STEP 4: Salary Calculation Engine
- Salary period management (create, lock, unlock)
- Automatic salary calculation based on:
  - Route base rates
  - Weight-based bonuses
  - Trip count bonuses
  - Deductions/penalties
- Salary slip generation per driver
- Period locking to prevent modifications

#### STEP 5: Dashboard & Reports
- Analytics dashboard with key metrics:
  - Total trips count
  - Total weight transported
  - Revenue summary
  - Driver performance stats
- Date range filtering
- Driver statistics breakdown

#### STEP 6: Migration & Go-Live
- Import script from Google Sheets/CSV
- Deduplication logic for historical data
- Parallel run documentation
- Go-live runbook

### Technical Stack
- Backend: NestJS 10, TypeScript
- Database: PostgreSQL 14, Prisma ORM
- Frontend: Next.js 14, TailwindCSS
- Auth: JWT with RBAC
- Containerization: Docker, docker-compose

### Documentation
- README.md with setup instructions
- Migration mapping documentation
- Parallel run procedures
- Go-live runbook
