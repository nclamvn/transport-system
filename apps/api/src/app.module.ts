import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { PrismaModule } from '@/common/prisma';
import { JwtAuthGuard, RolesGuard } from '@/common/guards';

import { AuthModule } from '@/modules/auth/auth.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { UsersModule } from '@/modules/users/users.module';
import { DriversModule } from '@/modules/drivers/drivers.module';
import { VehiclesModule } from '@/modules/vehicles/vehicles.module';
import { StationsModule } from '@/modules/stations/stations.module';
import { RoutesModule } from '@/modules/routes/routes.module';
import { TripsModule } from '@/modules/trips/trips.module';
import { SalaryModule } from '@/modules/salary/salary.module';
import { AnalyticsModule } from '@/modules/analytics/analytics.module';

import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    AuthModule,
    AuditModule,
    UsersModule,
    DriversModule,
    VehiclesModule,
    StationsModule,
    RoutesModule,
    TripsModule,
    SalaryModule,
    AnalyticsModule,
  ],
  controllers: [AppController],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
