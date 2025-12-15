import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateDriverDto, UpdateDriverDto } from './dto';

@Injectable()
export class DriversService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(options?: { isActive?: boolean }) {
    return this.prisma.driver.findMany({
      where: {
        isActive: options?.isActive,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
      orderBy: {
        employeeCode: 'asc',
      },
    });
  }

  async findById(id: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            phone: true,
          },
        },
      },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver;
  }

  async findByUserId(userId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { userId },
    });

    return driver;
  }

  async create(dto: CreateDriverDto, context?: AuditContext) {
    const existingDriver = await this.prisma.driver.findUnique({
      where: { employeeCode: dto.employeeCode },
    });

    if (existingDriver) {
      throw new ConflictException('Employee code already exists');
    }

    if (dto.userId) {
      const existingUserDriver = await this.prisma.driver.findUnique({
        where: { userId: dto.userId },
      });
      if (existingUserDriver) {
        throw new ConflictException('User already linked to another driver');
      }
    }

    const driver = await this.prisma.driver.create({
      data: {
        employeeCode: dto.employeeCode,
        name: dto.name,
        phone: dto.phone,
        licenseNo: dto.licenseNo,
        licenseType: dto.licenseType,
        userId: dto.userId,
        isActive: dto.isActive ?? true,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.logCreate('drivers', driver.id, driver, context);

    return driver;
  }

  async update(id: string, dto: UpdateDriverDto, context?: AuditContext) {
    const existingDriver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      throw new NotFoundException('Driver not found');
    }

    if (dto.employeeCode && dto.employeeCode !== existingDriver.employeeCode) {
      const duplicateCode = await this.prisma.driver.findUnique({
        where: { employeeCode: dto.employeeCode },
      });
      if (duplicateCode) {
        throw new ConflictException('Employee code already exists');
      }
    }

    if (dto.userId && dto.userId !== existingDriver.userId) {
      const existingUserDriver = await this.prisma.driver.findUnique({
        where: { userId: dto.userId },
      });
      if (existingUserDriver) {
        throw new ConflictException('User already linked to another driver');
      }
    }

    const driver = await this.prisma.driver.update({
      where: { id },
      data: dto,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    await this.auditService.logUpdate(
      'drivers',
      id,
      existingDriver,
      driver,
      context,
    );

    return driver;
  }

  async delete(id: string, context?: AuditContext) {
    const existingDriver = await this.prisma.driver.findUnique({
      where: { id },
    });

    if (!existingDriver) {
      throw new NotFoundException('Driver not found');
    }

    await this.prisma.driver.delete({
      where: { id },
    });

    await this.auditService.logDelete('drivers', id, existingDriver, context);

    return { message: 'Driver deleted successfully' };
  }
}
