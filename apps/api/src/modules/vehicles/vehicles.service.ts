import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

@Injectable()
export class VehiclesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(options?: { isActive?: boolean }) {
    return this.prisma.vehicle.findMany({
      where: {
        isActive: options?.isActive,
      },
      orderBy: {
        plateNo: 'asc',
      },
    });
  }

  async findById(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }

  async create(dto: CreateVehicleDto, context?: AuditContext) {
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { plateNo: dto.plateNo },
    });

    if (existingVehicle) {
      throw new ConflictException('Plate number already exists');
    }

    const vehicle = await this.prisma.vehicle.create({
      data: {
        plateNo: dto.plateNo,
        vehicleType: dto.vehicleType,
        capacity: dto.capacity,
        brand: dto.brand,
        model: dto.model,
        year: dto.year,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.logCreate('vehicles', vehicle.id, vehicle, context);

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto, context?: AuditContext) {
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    if (dto.plateNo && dto.plateNo !== existingVehicle.plateNo) {
      const duplicatePlate = await this.prisma.vehicle.findUnique({
        where: { plateNo: dto.plateNo },
      });
      if (duplicatePlate) {
        throw new ConflictException('Plate number already exists');
      }
    }

    const vehicle = await this.prisma.vehicle.update({
      where: { id },
      data: dto,
    });

    await this.auditService.logUpdate(
      'vehicles',
      id,
      existingVehicle,
      vehicle,
      context,
    );

    return vehicle;
  }

  async delete(id: string, context?: AuditContext) {
    const existingVehicle = await this.prisma.vehicle.findUnique({
      where: { id },
    });

    if (!existingVehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    await this.prisma.vehicle.delete({
      where: { id },
    });

    await this.auditService.logDelete('vehicles', id, existingVehicle, context);

    return { message: 'Vehicle deleted successfully' };
  }
}
