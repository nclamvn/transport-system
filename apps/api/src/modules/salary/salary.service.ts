import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreatePeriodDto, CreateRuleDto } from './dto';
import { SalaryPeriodStatus, TripStatus, SalaryRuleType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

interface CalculationBreakdown {
  tripId: string;
  tripCode: string;
  tripDate: string;
  routeName: string;
  weight: number;
  ratePerTon: number;
  amount: number;
}

interface SalaryCalculationResult {
  driverId: string;
  totalTrips: number;
  totalWeight: number;
  totalAmount: number;
  breakdown: CalculationBreakdown[];
  ruleVersionUsed: string;
}

@Injectable()
export class SalaryService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  // Generate period code: YYYY-MM-P1 or YYYY-MM-P2
  private generatePeriodCode(start: Date, end: Date): string {
    const year = start.getFullYear();
    const month = (start.getMonth() + 1).toString().padStart(2, '0');
    const day = start.getDate();
    const periodNum = day <= 15 ? 'P1' : 'P2';
    return `${year}-${month}-${periodNum}`;
  }

  // Get active salary rule for calculation
  async getActiveRule(date: Date = new Date()) {
    const rule = await this.prisma.salaryRule.findFirst({
      where: {
        isActive: true,
        ruleType: SalaryRuleType.PER_TON,
        effectiveFrom: { lte: date },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: date } },
        ],
      },
      orderBy: [
        { effectiveFrom: 'desc' },
        { version: 'desc' },
      ],
    });

    return rule;
  }

  // Create salary period
  async createPeriod(dto: CreatePeriodDto, context?: AuditContext) {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);

    // Validate dates
    if (periodEnd <= periodStart) {
      throw new BadRequestException('End date must be after start date');
    }

    // Generate code
    const code = this.generatePeriodCode(periodStart, periodEnd);

    // Check for duplicate
    const existing = await this.prisma.salaryPeriod.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Period with code ${code} already exists`);
    }

    const period = await this.prisma.salaryPeriod.create({
      data: {
        code,
        name: dto.name,
        periodStart,
        periodEnd,
        status: SalaryPeriodStatus.OPEN,
      },
    });

    await this.auditService.logCreate('salary_periods', period.id, period, context);

    return period;
  }

  // List all periods
  async listPeriods(options?: { status?: SalaryPeriodStatus; limit?: number }) {
    const where: Record<string, unknown> = {};

    if (options?.status) {
      where.status = options.status;
    }

    const periods = await this.prisma.salaryPeriod.findMany({
      where,
      orderBy: { periodStart: 'desc' },
      take: options?.limit || 50,
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    return periods;
  }

  // Get period by ID
  async getPeriodById(id: string) {
    const period = await this.prisma.salaryPeriod.findUnique({
      where: { id },
      include: {
        results: {
          include: {
            driver: {
              select: {
                id: true,
                employeeCode: true,
                name: true,
              },
            },
          },
          orderBy: { totalSalary: 'desc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Salary period not found');
    }

    return period;
  }

  // Recalculate salary for period
  async recalculate(periodId: string, context?: AuditContext) {
    const period = await this.prisma.salaryPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Salary period not found');
    }

    // Check if period is closed
    if (period.status === SalaryPeriodStatus.LOCKED) {
      throw new ConflictException('Cannot recalculate closed period');
    }

    // Get active rule
    const rule = await this.getActiveRule(period.periodStart);
    if (!rule) {
      throw new BadRequestException('No active salary rule found');
    }

    // Get rate from rule
    const ratePerTon = Number(rule.rateAmount);

    // Update period status to CALCULATING
    await this.prisma.salaryPeriod.update({
      where: { id: periodId },
      data: { status: SalaryPeriodStatus.CALCULATING },
    });

    try {
      // Get all APPROVED trips in period
      const trips = await this.prisma.trip.findMany({
        where: {
          status: TripStatus.APPROVED,
          tripDate: {
            gte: period.periodStart,
            lte: period.periodEnd,
          },
          deletedAt: null,
        },
        include: {
          driver: {
            select: {
              id: true,
              employeeCode: true,
              name: true,
            },
          },
          route: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: { tripDate: 'asc' },
      });

      // Group trips by driver
      const driverTrips = new Map<string, typeof trips>();
      for (const trip of trips) {
        const existing = driverTrips.get(trip.driverId) || [];
        existing.push(trip);
        driverTrips.set(trip.driverId, existing);
      }

      // Calculate for each driver
      const results: SalaryCalculationResult[] = [];

      for (const [driverId, driverTripsList] of driverTrips) {
        const breakdown: CalculationBreakdown[] = [];
        let totalWeight = 0;
        let totalAmount = 0;

        for (const trip of driverTripsList) {
          // Use weightFinal if available, otherwise weightLoaded
          const weight = trip.weightFinal
            ? Number(trip.weightFinal)
            : trip.weightLoaded
              ? Number(trip.weightLoaded)
              : 0;

          const amount = weight * ratePerTon;

          breakdown.push({
            tripId: trip.id,
            tripCode: trip.tripCode,
            tripDate: trip.tripDate.toISOString(),
            routeName: trip.route.name,
            weight,
            ratePerTon,
            amount,
          });

          totalWeight += weight;
          totalAmount += amount;
        }

        results.push({
          driverId,
          totalTrips: driverTripsList.length,
          totalWeight,
          totalAmount,
          breakdown,
          ruleVersionUsed: rule.id,
        });
      }

      // Delete existing results for this period
      await this.prisma.salaryResult.deleteMany({
        where: { periodId },
      });

      // Insert new results
      for (const result of results) {
        await this.prisma.salaryResult.create({
          data: {
            periodId,
            driverId: result.driverId,
            totalTrips: result.totalTrips,
            totalWeight: result.totalWeight,
            baseSalary: result.totalAmount,
            totalSalary: result.totalAmount,
            calculationDetails: JSON.parse(JSON.stringify(result.breakdown)),
            calculatedAt: new Date(),
            calculationVersion: 1,
            ruleVersionUsed: result.ruleVersionUsed,
          },
        });
      }

      // Update period status back to OPEN
      const updatedPeriod = await this.prisma.salaryPeriod.update({
        where: { id: periodId },
        data: { status: SalaryPeriodStatus.OPEN },
        include: {
          results: {
            include: {
              driver: {
                select: {
                  id: true,
                  employeeCode: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      await this.auditService.logUpdate(
        'salary_periods',
        periodId,
        period,
        { ...updatedPeriod, action: 'recalculate', resultsCount: results.length },
        context,
      );

      return {
        period: updatedPeriod,
        summary: {
          totalDrivers: results.length,
          totalTrips: trips.length,
          totalWeight: results.reduce((sum, r) => sum + r.totalWeight, 0),
          totalAmount: results.reduce((sum, r) => sum + r.totalAmount, 0),
          ruleUsed: {
            id: rule.id,
            name: rule.name,
            ratePerTon,
          },
        },
      };
    } catch (error) {
      // Reset status on error
      await this.prisma.salaryPeriod.update({
        where: { id: periodId },
        data: { status: SalaryPeriodStatus.OPEN },
      });
      throw error;
    }
  }

  // Get results for period
  async getResults(periodId: string, driverId?: string) {
    const period = await this.prisma.salaryPeriod.findUnique({
      where: { id: periodId },
    });

    if (!period) {
      throw new NotFoundException('Salary period not found');
    }

    const where: Record<string, unknown> = { periodId };
    if (driverId) {
      where.driverId = driverId;
    }

    const results = await this.prisma.salaryResult.findMany({
      where,
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            phone: true,
          },
        },
      },
      orderBy: { totalSalary: 'desc' },
    });

    return { period, results };
  }

  // Get driver result detail
  async getDriverResult(periodId: string, driverId: string) {
    const result = await this.prisma.salaryResult.findUnique({
      where: {
        periodId_driverId: {
          periodId,
          driverId,
        },
      },
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            phone: true,
          },
        },
        period: true,
      },
    });

    if (!result) {
      throw new NotFoundException('Salary result not found');
    }

    return result;
  }

  // Close period
  async closePeriod(periodId: string, userId: string, context?: AuditContext) {
    const period = await this.prisma.salaryPeriod.findUnique({
      where: { id: periodId },
      include: {
        _count: {
          select: { results: true },
        },
      },
    });

    if (!period) {
      throw new NotFoundException('Salary period not found');
    }

    if (period.status === SalaryPeriodStatus.LOCKED) {
      throw new ConflictException('Period is already closed');
    }

    // Must have at least one result to close
    if (period._count.results === 0) {
      throw new BadRequestException(
        'Cannot close period without salary results. Please run recalculate first.',
      );
    }

    const updatedPeriod = await this.prisma.salaryPeriod.update({
      where: { id: periodId },
      data: {
        status: SalaryPeriodStatus.LOCKED,
        lockedAt: new Date(),
        lockedById: userId,
      },
    });

    await this.auditService.logUpdate(
      'salary_periods',
      periodId,
      period,
      { ...updatedPeriod, action: 'close' },
      context,
    );

    return updatedPeriod;
  }

  // Export data for period
  async getExportData(periodId: string) {
    const { period, results } = await this.getResults(periodId);

    return {
      period: {
        code: period.code,
        name: period.name,
        start: period.periodStart,
        end: period.periodEnd,
        status: period.status,
      },
      data: results.map((r) => ({
        employeeCode: r.driver.employeeCode,
        driverName: r.driver.name,
        totalTrips: r.totalTrips,
        totalWeight: Number(r.totalWeight),
        totalAmount: Number(r.totalSalary),
      })),
      summary: {
        totalDrivers: results.length,
        totalTrips: results.reduce((sum, r) => sum + r.totalTrips, 0),
        totalWeight: results.reduce((sum, r) => sum + Number(r.totalWeight), 0),
        totalAmount: results.reduce((sum, r) => sum + Number(r.totalSalary), 0),
      },
    };
  }

  // Create salary rule
  async createRule(dto: CreateRuleDto, userId: string, context?: AuditContext) {
    const rule = await this.prisma.salaryRule.create({
      data: {
        name: dto.name,
        description: dto.description,
        ruleType: SalaryRuleType.PER_TON,
        rateAmount: dto.ratePerTon,
        configJson: { ratePerTon: dto.ratePerTon },
        effectiveFrom: new Date(dto.effectiveFrom),
        effectiveTo: dto.effectiveTo ? new Date(dto.effectiveTo) : null,
        routeId: dto.routeId,
        createdById: userId,
        isActive: true,
        version: 1,
      },
    });

    await this.auditService.logCreate('salary_rules', rule.id, rule, context);

    return rule;
  }

  // List salary rules
  async listRules(options?: { activeOnly?: boolean }) {
    const where: Record<string, unknown> = {};

    if (options?.activeOnly) {
      where.isActive = true;
    }

    return this.prisma.salaryRule.findMany({
      where,
      orderBy: [{ effectiveFrom: 'desc' }, { version: 'desc' }],
      include: {
        route: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });
  }
}
