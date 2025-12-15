import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { TripStatus } from '@prisma/client';

export interface DateRange {
  from: Date;
  to: Date;
}

export interface OverviewData {
  totalTrips: number;
  approvedTrips: number;
  rejectedTrips: number;
  pendingTrips: number;
  draftTrips: number;
  totalTons: number;
  totalAmount: number;
  amountSource: 'salary_period' | 'estimated';
  activeDrivers: number;
  activeVehicles: number;
}

export interface TonsByDay {
  date: string;
  tons: number;
  trips: number;
}

export interface TonsByStation {
  stationId: string;
  stationName: string;
  stationType: string;
  tons: number;
  trips: number;
}

export interface TopDriver {
  driverId: string;
  employeeCode: string;
  driverName: string;
  trips: number;
  tons: number;
  avgTonsPerTrip: number;
}

export interface Exception {
  tripId: string;
  tripCode: string;
  tripDate: string;
  driverName: string;
  vehiclePlate: string;
  routeName: string;
  originName: string;
  destinationName: string;
  rejectionReason: string;
  rejectedAt: string;
}

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  private getDefaultDateRange(): DateRange {
    const to = new Date();
    const from = new Date();
    from.setDate(from.getDate() - 7);
    return { from, to };
  }

  async getOverview(range?: DateRange): Promise<OverviewData> {
    const { from, to } = range || this.getDefaultDateRange();

    // Base where clause
    const dateFilter = {
      tripDate: {
        gte: from,
        lte: to,
      },
      deletedAt: null,
    };

    // Count trips by status
    const [
      totalTrips,
      approvedTrips,
      rejectedTrips,
      pendingTrips,
      draftTrips,
    ] = await Promise.all([
      this.prisma.trip.count({ where: dateFilter }),
      this.prisma.trip.count({ where: { ...dateFilter, status: TripStatus.APPROVED } }),
      this.prisma.trip.count({ where: { ...dateFilter, status: TripStatus.REJECTED } }),
      this.prisma.trip.count({ where: { ...dateFilter, status: TripStatus.PENDING } }),
      this.prisma.trip.count({ where: { ...dateFilter, status: TripStatus.DRAFT } }),
    ]);

    // Calculate total tons from APPROVED trips
    const tonsResult = await this.prisma.trip.aggregate({
      where: {
        ...dateFilter,
        status: TripStatus.APPROVED,
      },
      _sum: {
        weightFinal: true,
      },
    });

    const totalTons = Number(tonsResult._sum.weightFinal || 0);

    // Get estimated amount using current active rule
    let totalAmount = 0;
    let amountSource: 'salary_period' | 'estimated' = 'estimated';

    // Try to get from salary period first
    const salaryPeriod = await this.prisma.salaryPeriod.findFirst({
      where: {
        periodStart: { lte: to },
        periodEnd: { gte: from },
        status: 'LOCKED',
      },
      include: {
        results: true,
      },
    });

    if (salaryPeriod && salaryPeriod.results.length > 0) {
      totalAmount = salaryPeriod.results.reduce(
        (sum, r) => sum + Number(r.totalSalary),
        0,
      );
      amountSource = 'salary_period';
    } else {
      // Estimate using current rule
      const activeRule = await this.prisma.salaryRule.findFirst({
        where: {
          isActive: true,
          ruleType: 'PER_TON',
          effectiveFrom: { lte: new Date() },
          OR: [
            { effectiveTo: null },
            { effectiveTo: { gte: new Date() } },
          ],
        },
        orderBy: { effectiveFrom: 'desc' },
      });

      if (activeRule) {
        totalAmount = totalTons * Number(activeRule.rateAmount);
      }
    }

    // Count active drivers and vehicles in period
    const [activeDrivers, activeVehicles] = await Promise.all([
      this.prisma.trip.groupBy({
        by: ['driverId'],
        where: dateFilter,
      }).then((groups) => groups.length),
      this.prisma.trip.groupBy({
        by: ['vehicleId'],
        where: dateFilter,
      }).then((groups) => groups.length),
    ]);

    return {
      totalTrips,
      approvedTrips,
      rejectedTrips,
      pendingTrips,
      draftTrips,
      totalTons,
      totalAmount,
      amountSource,
      activeDrivers,
      activeVehicles,
    };
  }

  async getTonsByDay(range?: DateRange): Promise<TonsByDay[]> {
    const { from, to } = range || this.getDefaultDateRange();

    // Get approved trips grouped by day
    const trips = await this.prisma.trip.findMany({
      where: {
        tripDate: {
          gte: from,
          lte: to,
        },
        status: TripStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        tripDate: true,
        weightFinal: true,
      },
      orderBy: { tripDate: 'asc' },
    });

    // Group by date
    const byDay = new Map<string, { tons: number; trips: number }>();

    for (const trip of trips) {
      const dateKey = trip.tripDate.toISOString().split('T')[0];
      const current = byDay.get(dateKey) || { tons: 0, trips: 0 };
      current.tons += Number(trip.weightFinal || 0);
      current.trips += 1;
      byDay.set(dateKey, current);
    }

    // Fill in missing days with zeros
    const result: TonsByDay[] = [];
    const currentDate = new Date(from);
    while (currentDate <= to) {
      const dateKey = currentDate.toISOString().split('T')[0];
      const data = byDay.get(dateKey) || { tons: 0, trips: 0 };
      result.push({
        date: dateKey,
        tons: Number(data.tons.toFixed(2)),
        trips: data.trips,
      });
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return result;
  }

  async getTonsByStation(range?: DateRange, limit = 10): Promise<TonsByStation[]> {
    const { from, to } = range || this.getDefaultDateRange();

    // Get approved trips with origin station
    const trips = await this.prisma.trip.findMany({
      where: {
        tripDate: {
          gte: from,
          lte: to,
        },
        status: TripStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        originId: true,
        origin: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
        weightFinal: true,
      },
    });

    // Group by origin station
    const byStation = new Map<string, TonsByStation>();

    for (const trip of trips) {
      const stationId = trip.originId;
      const current = byStation.get(stationId) || {
        stationId,
        stationName: trip.origin.name,
        stationType: trip.origin.type,
        tons: 0,
        trips: 0,
      };
      current.tons += Number(trip.weightFinal || 0);
      current.trips += 1;
      byStation.set(stationId, current);
    }

    // Sort by tons descending and limit
    return Array.from(byStation.values())
      .sort((a, b) => b.tons - a.tons)
      .slice(0, limit)
      .map((s) => ({ ...s, tons: Number(s.tons.toFixed(2)) }));
  }

  async getTopDrivers(range?: DateRange, limit = 10): Promise<TopDriver[]> {
    const { from, to } = range || this.getDefaultDateRange();

    // Get approved trips with driver
    const trips = await this.prisma.trip.findMany({
      where: {
        tripDate: {
          gte: from,
          lte: to,
        },
        status: TripStatus.APPROVED,
        deletedAt: null,
      },
      select: {
        driverId: true,
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
          },
        },
        weightFinal: true,
      },
    });

    // Group by driver
    const byDriver = new Map<string, TopDriver>();

    for (const trip of trips) {
      const driverId = trip.driverId;
      const current = byDriver.get(driverId) || {
        driverId,
        employeeCode: trip.driver.employeeCode,
        driverName: trip.driver.name,
        trips: 0,
        tons: 0,
        avgTonsPerTrip: 0,
      };
      current.tons += Number(trip.weightFinal || 0);
      current.trips += 1;
      byDriver.set(driverId, current);
    }

    // Calculate average and sort
    return Array.from(byDriver.values())
      .map((d) => ({
        ...d,
        tons: Number(d.tons.toFixed(2)),
        avgTonsPerTrip: Number((d.tons / d.trips).toFixed(2)),
      }))
      .sort((a, b) => b.tons - a.tons)
      .slice(0, limit);
  }

  async getExceptions(range?: DateRange, limit = 50): Promise<Exception[]> {
    const { from, to } = range || this.getDefaultDateRange();

    const trips = await this.prisma.trip.findMany({
      where: {
        tripDate: {
          gte: from,
          lte: to,
        },
        status: TripStatus.REJECTED,
        deletedAt: null,
      },
      select: {
        id: true,
        tripCode: true,
        tripDate: true,
        rejectionReason: true,
        updatedAt: true,
        driver: {
          select: { name: true },
        },
        vehicle: {
          select: { plateNo: true },
        },
        route: {
          select: { name: true },
        },
        origin: {
          select: { name: true },
        },
        destination: {
          select: { name: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return trips.map((t) => ({
      tripId: t.id,
      tripCode: t.tripCode,
      tripDate: t.tripDate.toISOString(),
      driverName: t.driver.name,
      vehiclePlate: t.vehicle.plateNo,
      routeName: t.route.name,
      originName: t.origin.name,
      destinationName: t.destination.name,
      rejectionReason: t.rejectionReason || '',
      rejectedAt: t.updatedAt.toISOString(),
    }));
  }
}
