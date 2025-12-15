import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/common/prisma';
import { AuditService, AuditContext } from '@/modules/audit';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll(options?: { isActive?: boolean }) {
    return this.prisma.user.findMany({
      where: {
        isActive: options?.isActive,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            id: true,
            employeeCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        driver: {
          select: {
            id: true,
            employeeCode: true,
            name: true,
            licenseNo: true,
            licenseType: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(dto: CreateUserDto, context?: AuditContext) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        phone: dto.phone,
        roles: dto.roles || [Role.DRIVER],
        isActive: dto.isActive ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Audit log
    await this.auditService.logCreate(
      'users',
      user.id,
      { ...user, password: '[REDACTED]' },
      context,
    );

    return user;
  }

  async update(id: string, dto: UpdateUserDto, context?: AuditContext) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    const updateData: Record<string, unknown> = {};

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }
    if (dto.name !== undefined) updateData.name = dto.name;
    if (dto.phone !== undefined) updateData.phone = dto.phone;
    if (dto.roles !== undefined) updateData.roles = dto.roles;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    const user = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        roles: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Audit log
    const beforeData = { ...existingUser, password: '[REDACTED]' };
    const afterData = { ...user, password: '[REDACTED]' };
    await this.auditService.logUpdate('users', id, beforeData, afterData, context);

    return user;
  }

  async delete(id: string, context?: AuditContext) {
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    // Audit log
    await this.auditService.logDelete(
      'users',
      id,
      { ...existingUser, password: '[REDACTED]' },
      context,
    );

    return { message: 'User deleted successfully' };
  }
}
