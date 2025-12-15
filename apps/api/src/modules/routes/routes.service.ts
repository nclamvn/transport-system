import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateRouteDto, UpdateRouteDto } from './dto';

@Injectable()
export class RoutesService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(options?: { isActive?: boolean }) {
    return this.prisma.route.findMany({
      where: {
        isActive: options?.isActive,
      },
      include: {
        origin: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
        destination: {
          select: {
            id: true,
            code: true,
            name: true,
            type: true,
          },
        },
      },
      orderBy: {
        code: 'asc',
      },
    });
  }

  async findById(id: string) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: {
        origin: true,
        destination: true,
      },
    });

    if (!route) {
      throw new NotFoundException('Route not found');
    }

    return route;
  }

  async create(dto: CreateRouteDto, context?: AuditContext) {
    const existingRoute = await this.prisma.route.findUnique({
      where: { code: dto.code },
    });

    if (existingRoute) {
      throw new ConflictException('Route code already exists');
    }

    // Verify origin and destination exist
    const [origin, destination] = await Promise.all([
      this.prisma.station.findUnique({ where: { id: dto.originId } }),
      this.prisma.station.findUnique({ where: { id: dto.destinationId } }),
    ]);

    if (!origin) {
      throw new NotFoundException('Origin station not found');
    }
    if (!destination) {
      throw new NotFoundException('Destination station not found');
    }

    const route = await this.prisma.route.create({
      data: {
        code: dto.code,
        name: dto.name,
        originId: dto.originId,
        destinationId: dto.destinationId,
        distance: dto.distance,
        defaultRatePerTon: dto.defaultRatePerTon,
        isActive: dto.isActive ?? true,
      },
      include: {
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

    await this.auditService.logCreate('routes', route.id, route, context);

    return route;
  }

  async update(id: string, dto: UpdateRouteDto, context?: AuditContext) {
    const existingRoute = await this.prisma.route.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      throw new NotFoundException('Route not found');
    }

    if (dto.code && dto.code !== existingRoute.code) {
      const duplicateCode = await this.prisma.route.findUnique({
        where: { code: dto.code },
      });
      if (duplicateCode) {
        throw new ConflictException('Route code already exists');
      }
    }

    if (dto.originId) {
      const origin = await this.prisma.station.findUnique({
        where: { id: dto.originId },
      });
      if (!origin) {
        throw new NotFoundException('Origin station not found');
      }
    }

    if (dto.destinationId) {
      const destination = await this.prisma.station.findUnique({
        where: { id: dto.destinationId },
      });
      if (!destination) {
        throw new NotFoundException('Destination station not found');
      }
    }

    const route = await this.prisma.route.update({
      where: { id },
      data: dto,
      include: {
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

    await this.auditService.logUpdate('routes', id, existingRoute, route, context);

    return route;
  }

  async delete(id: string, context?: AuditContext) {
    const existingRoute = await this.prisma.route.findUnique({
      where: { id },
    });

    if (!existingRoute) {
      throw new NotFoundException('Route not found');
    }

    await this.prisma.route.delete({
      where: { id },
    });

    await this.auditService.logDelete('routes', id, existingRoute, context);

    return { message: 'Route deleted successfully' };
  }
}
