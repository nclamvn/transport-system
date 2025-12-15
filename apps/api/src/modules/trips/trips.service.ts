import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateTripDto, UpdateTripDto } from './dto';
import { TripStatus, TripRecordType } from '@prisma/client';

@Injectable()
export class TripsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  private generateTripCode(): string {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TR${year}${month}${day}-${random}`;
  }

  // Base where clause - always exclude soft deleted
  private baseWhere() {
    return { deletedAt: null };
  }

  async findAll(options?: {
    driverId?: string;
    vehicleId?: string;
    routeId?: string;
    status?: TripStatus;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
    offset?: number;
  }) {
    const where: Record<string, unknown> = {
      ...this.baseWhere(),
    };

    if (options?.driverId) {
      where.driverId = options.driverId;
    }
    if (options?.vehicleId) {
      where.vehicleId = options.vehicleId;
    }
    if (options?.routeId) {
      where.routeId = options.routeId;
    }
    if (options?.status) {
      where.status = options.status;
    }
    if (options?.startDate || options?.endDate) {
      where.tripDate = {};
      if (options.startDate) {
        (where.tripDate as Record<string, Date>).gte = options.startDate;
      }
      if (options.endDate) {
        (where.tripDate as Record<string, Date>).lte = options.endDate;
      }
    }

    const [trips, total] = await Promise.all([
      this.prisma.trip.findMany({
        where,
        include: {
          driver: {
            select: {
              id: true,
              employeeCode: true,
              name: true,
            },
          },
          vehicle: {
            select: {
              id: true,
              plateNo: true,
              vehicleType: true,
            },
          },
          route: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          origin: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          destination: {
            select: {
              id: true,
              code: true,
              name: true,
            },
          },
          records: true,
        },
        orderBy: [{ tripDate: 'desc' }, { createdAt: 'desc' }],
        take: options?.limit || 50,
        skip: options?.offset || 0,
      }),
      this.prisma.trip.count({ where }),
    ]);

    return { trips, total };
  }

  // Get review queue - trips pending review with filters
  async getReviewQueue(options?: {
    status?: TripStatus;
    driverId?: string;
    vehicleId?: string;
    routeId?: string;
    dateFrom?: Date;
    dateTo?: Date;
    limit?: number;
    offset?: number;
  }) {
    // Default to PENDING status for review queue
    const status = options?.status || TripStatus.PENDING;

    return this.findAll({
      status,
      driverId: options?.driverId,
      vehicleId: options?.vehicleId,
      routeId: options?.routeId,
      startDate: options?.dateFrom,
      endDate: options?.dateTo,
      limit: options?.limit,
      offset: options?.offset,
    });
  }

  async findById(id: string, includeAudit = false) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
      include: {
        driver: true,
        vehicle: true,
        route: {
          include: {
            origin: true,
            destination: true,
          },
        },
        origin: true,
        destination: true,
        records: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Include audit summary if requested (for review detail page)
    if (includeAudit) {
      const auditLogs = await this.prisma.auditLog.findMany({
        where: {
          entity: 'trips',
          entityId: id,
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: {
          id: true,
          action: true,
          changes: true,
          userEmail: true,
          createdAt: true,
        },
      });

      return { ...trip, auditLogs };
    }

    return trip;
  }

  // Row-level enforcement: Get trips for specific driver only
  async findByDriver(
    driverId: string,
    options?: { status?: TripStatus; limit?: number },
  ) {
    // ENFORCE: Always filter by driverId at service layer
    return this.findAll({
      driverId, // This is ENFORCED, not optional
      status: options?.status,
      limit: options?.limit,
    });
  }

  // Row-level enforcement: Get single trip for driver
  async findByIdForDriver(tripId: string, driverId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        driverId, // ENFORCE: Must match driver
        ...this.baseWhere(),
      },
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNo: true,
            vehicleType: true,
          },
        },
        route: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        origin: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        destination: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        records: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    return trip;
  }

  // Row-level enforcement: Create trip for driver (driver can only create for themselves)
  async createForDriver(
    dto: CreateTripDto,
    driverId: string,
    context?: AuditContext,
  ) {
    // ENFORCE: Override driverId with authenticated driver's ID
    return this.create({ ...dto, driverId }, context);
  }

  async create(dto: CreateTripDto, context?: AuditContext) {
    // Verify all references exist
    const [driver, vehicle, route, origin, destination] = await Promise.all([
      this.prisma.driver.findUnique({ where: { id: dto.driverId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      this.prisma.route.findUnique({ where: { id: dto.routeId } }),
      this.prisma.station.findUnique({ where: { id: dto.originId } }),
      this.prisma.station.findUnique({ where: { id: dto.destinationId } }),
    ]);

    if (!driver) throw new NotFoundException('Driver not found');
    if (!vehicle) throw new NotFoundException('Vehicle not found');
    if (!route) throw new NotFoundException('Route not found');
    if (!origin) throw new NotFoundException('Origin station not found');
    if (!destination)
      throw new NotFoundException('Destination station not found');

    const tripCode = this.generateTripCode();

    const trip = await this.prisma.trip.create({
      data: {
        tripCode,
        driverId: dto.driverId,
        vehicleId: dto.vehicleId,
        routeId: dto.routeId,
        originId: dto.originId,
        destinationId: dto.destinationId,
        tripDate: new Date(dto.tripDate),
        departureTime: dto.departureTime
          ? new Date(dto.departureTime)
          : undefined,
        arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : undefined,
        weightLoaded: dto.weightLoaded,
        weightUnloaded: dto.weightUnloaded,
        note: dto.note,
        status: TripStatus.DRAFT,
      },
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNo: true,
          },
        },
        route: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        origin: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
        destination: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.logCreate('trips', trip.id, trip, context);

    return trip;
  }

  async update(id: string, dto: UpdateTripDto, context?: AuditContext) {
    const existingTrip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
    });

    if (!existingTrip) {
      throw new NotFoundException('Trip not found');
    }

    // Prevent editing locked trips
    if (existingTrip.status === TripStatus.APPROVED) {
      throw new ForbiddenException('Cannot edit approved trips');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.driverId !== undefined) updateData.driverId = dto.driverId;
    if (dto.vehicleId !== undefined) updateData.vehicleId = dto.vehicleId;
    if (dto.routeId !== undefined) updateData.routeId = dto.routeId;
    if (dto.originId !== undefined) updateData.originId = dto.originId;
    if (dto.destinationId !== undefined)
      updateData.destinationId = dto.destinationId;
    if (dto.tripDate !== undefined)
      updateData.tripDate = new Date(dto.tripDate);
    if (dto.departureTime !== undefined)
      updateData.departureTime = dto.departureTime
        ? new Date(dto.departureTime)
        : null;
    if (dto.arrivalTime !== undefined)
      updateData.arrivalTime = dto.arrivalTime
        ? new Date(dto.arrivalTime)
        : null;
    if (dto.weightLoaded !== undefined)
      updateData.weightLoaded = dto.weightLoaded;
    if (dto.weightUnloaded !== undefined)
      updateData.weightUnloaded = dto.weightUnloaded;
    if (dto.weightFinal !== undefined) updateData.weightFinal = dto.weightFinal;
    if (dto.status !== undefined) updateData.status = dto.status;
    if (dto.note !== undefined) updateData.note = dto.note;
    if (dto.rejectionReason !== undefined)
      updateData.rejectionReason = dto.rejectionReason;

    const trip = await this.prisma.trip.update({
      where: { id },
      data: updateData,
      include: {
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
          },
        },
        vehicle: {
          select: {
            id: true,
            plateNo: true,
          },
        },
        route: {
          select: {
            id: true,
            code: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.logUpdate('trips', id, existingTrip, trip, context);

    return trip;
  }

  // Row-level: Driver submit their own trip
  async submitForReviewByDriver(
    tripId: string,
    driverId: string,
    context?: AuditContext,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, driverId, ...this.baseWhere() },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    if (trip.status !== TripStatus.DRAFT) {
      throw new ForbiddenException('Only draft trips can be submitted');
    }

    return this.update(tripId, { status: TripStatus.PENDING }, context);
  }

  async submitForReview(id: string, context?: AuditContext) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (trip.status !== TripStatus.DRAFT) {
      throw new ForbiddenException('Only draft trips can be submitted');
    }

    return this.update(id, { status: TripStatus.PENDING }, context);
  }

  async approve(id: string, weightFinal?: number, context?: AuditContext) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
      include: {
        driver: { select: { id: true, employeeCode: true, name: true } },
        vehicle: { select: { id: true, plateNo: true } },
        route: { select: { id: true, code: true, name: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Idempotency: if already approved, return current state with 409 status info
    if (trip.status === TripStatus.APPROVED) {
      throw new ConflictException({
        message: 'Trip already approved',
        trip,
        alreadyProcessed: true,
      });
    }

    // State machine: Only PENDING can be approved
    if (trip.status !== TripStatus.PENDING) {
      throw new ForbiddenException(
        `Cannot approve trip with status '${trip.status}'. Only PENDING trips can be approved.`,
      );
    }

    // Use weightLoaded as default if weightFinal not provided
    const finalWeight =
      weightFinal ?? (trip.weightLoaded ? Number(trip.weightLoaded) : undefined);

    return this.update(
      id,
      { status: TripStatus.APPROVED, weightFinal: finalWeight },
      context,
    );
  }

  async reject(id: string, reason: string, context?: AuditContext) {
    const trip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
      include: {
        driver: { select: { id: true, employeeCode: true, name: true } },
        vehicle: { select: { id: true, plateNo: true } },
        route: { select: { id: true, code: true, name: true } },
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Reject must have reason
    if (!reason || reason.trim().length === 0) {
      throw new BadRequestException('Rejection reason is required');
    }

    // Idempotency: if already rejected, return current state with 409 status info
    if (trip.status === TripStatus.REJECTED) {
      throw new ConflictException({
        message: 'Trip already rejected',
        trip,
        alreadyProcessed: true,
      });
    }

    // State machine: Only PENDING can be rejected
    if (trip.status !== TripStatus.PENDING) {
      throw new ForbiddenException(
        `Cannot reject trip with status '${trip.status}'. Only PENDING trips can be rejected.`,
      );
    }

    return this.update(
      id,
      { status: TripStatus.REJECTED, rejectionReason: reason.trim() },
      context,
    );
  }

  // SOFT DELETE - không xóa thật
  async delete(id: string, context?: AuditContext) {
    const existingTrip = await this.prisma.trip.findFirst({
      where: { id, ...this.baseWhere() },
    });

    if (!existingTrip) {
      throw new NotFoundException('Trip not found');
    }

    if (existingTrip.status === TripStatus.APPROVED) {
      throw new ForbiddenException('Cannot delete approved trips');
    }

    // SOFT DELETE: Set deletedAt instead of hard delete
    const trip = await this.prisma.trip.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    await this.auditService.logDelete('trips', id, existingTrip, context);

    return { message: 'Trip deleted successfully', deletedAt: trip.deletedAt };
  }

  // Check if driver can access this trip
  async canDriverAccess(tripId: string, driverId: string): Promise<boolean> {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ...this.baseWhere() },
      select: { driverId: true },
    });

    return trip?.driverId === driverId;
  }

  // Add attachment to trip
  async addAttachment(
    tripId: string,
    attachment: {
      recordType: TripRecordType;
      fileUrl: string;
      fileName: string;
      fileType: string;
      ticketNo?: string;
      weight?: number;
      note?: string;
    },
    context?: AuditContext,
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, ...this.baseWhere() },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Don't allow attachments on approved trips
    if (trip.status === TripStatus.APPROVED) {
      throw new ForbiddenException('Cannot add attachments to approved trips');
    }

    const record = await this.prisma.tripRecord.create({
      data: {
        tripId,
        recordType: attachment.recordType,
        fileUrl: attachment.fileUrl,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        ticketNo: attachment.ticketNo,
        weight: attachment.weight,
        note: attachment.note,
        weighedAt: attachment.weight ? new Date() : undefined,
      },
    });

    await this.auditService.logCreate('trip_records', record.id, record, context);

    return record;
  }

  // Row-level: Add attachment for driver's own trip
  async addAttachmentForDriver(
    tripId: string,
    driverId: string,
    attachment: {
      recordType: TripRecordType;
      fileUrl: string;
      fileName: string;
      fileType: string;
      ticketNo?: string;
      weight?: number;
      note?: string;
    },
    context?: AuditContext,
  ) {
    // ENFORCE: Verify trip belongs to driver
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, driverId, ...this.baseWhere() },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found or access denied');
    }

    return this.addAttachment(tripId, attachment, context);
  }
}
