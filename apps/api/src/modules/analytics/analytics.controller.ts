import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService, DateRange } from './analytics.service';
import { Roles } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role } from '@prisma/client';

@Controller('analytics')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.DISPATCHER, Role.HR) // No DRIVER access
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  private parseDateRange(from?: string, to?: string): DateRange | undefined {
    if (!from && !to) return undefined;

    const now = new Date();
    const defaultFrom = new Date();
    defaultFrom.setDate(defaultFrom.getDate() - 7);

    return {
      from: from ? new Date(from) : defaultFrom,
      to: to ? new Date(to) : now,
    };
  }

  @Get('overview')
  getOverview(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getOverview(this.parseDateRange(from, to));
  }

  @Get('tons-by-day')
  getTonsByDay(
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.analyticsService.getTonsByDay(this.parseDateRange(from, to));
  }

  @Get('tons-by-station')
  getTonsByStation(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getTonsByStation(
      this.parseDateRange(from, to),
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('top-drivers')
  getTopDrivers(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getTopDrivers(
      this.parseDateRange(from, to),
      limit ? parseInt(limit, 10) : 10,
    );
  }

  @Get('exceptions')
  getExceptions(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.analyticsService.getExceptions(
      this.parseDateRange(from, to),
      limit ? parseInt(limit, 10) : 50,
    );
  }
}
