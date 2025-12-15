import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateStationDto, UpdateStationDto } from './dto';
import { StationType } from '@prisma/client';

@Injectable()
export class StationsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(options?: { isActive?: boolean; type?: StationType }) {
    return this.prisma.station.findMany({
      where: {
        isActive: options?.isActive,
        type: options?.type,
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  async findById(id: string) {
    const station = await this.prisma.station.findUnique({
      where: { id },
    });

    if (!station) {
      throw new NotFoundException('Station not found');
    }

    return station;
  }

  async create(dto: CreateStationDto, context?: AuditContext) {
    const existingStation = await this.prisma.station.findUnique({
      where: { code: dto.code },
    });

    if (existingStation) {
      throw new ConflictException('Station code already exists');
    }

    const station = await this.prisma.station.create({
      data: {
        code: dto.code,
        name: dto.name,
        type: dto.type,
        address: dto.address,
        lat: dto.lat,
        lng: dto.lng,
        isActive: dto.isActive ?? true,
      },
    });

    await this.auditService.logCreate('stations', station.id, station, context);

    return station;
  }

  async update(id: string, dto: UpdateStationDto, context?: AuditContext) {
    const existingStation = await this.prisma.station.findUnique({
      where: { id },
    });

    if (!existingStation) {
      throw new NotFoundException('Station not found');
    }

    if (dto.code && dto.code !== existingStation.code) {
      const duplicateCode = await this.prisma.station.findUnique({
        where: { code: dto.code },
      });
      if (duplicateCode) {
        throw new ConflictException('Station code already exists');
      }
    }

    const station = await this.prisma.station.update({
      where: { id },
      data: dto,
    });

    await this.auditService.logUpdate(
      'stations',
      id,
      existingStation,
      station,
      context,
    );

    return station;
  }

  async delete(id: string, context?: AuditContext) {
    const existingStation = await this.prisma.station.findUnique({
      where: { id },
    });

    if (!existingStation) {
      throw new NotFoundException('Station not found');
    }

    await this.prisma.station.delete({
      where: { id },
    });

    await this.auditService.logDelete('stations', id, existingStation, context);

    return { message: 'Station deleted successfully' };
  }
}
