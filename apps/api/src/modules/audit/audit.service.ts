import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/common/prisma';
import { AuditAction } from '@prisma/client';

export interface AuditContext {
  userId?: string;
  userEmail?: string;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

export interface CreateAuditParams {
  entity: string;
  entityId: string;
  action: AuditAction;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  context?: AuditContext;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(params: CreateAuditParams) {
    const { entity, entityId, action, before, after, context } = params;

    // Calculate changes (only for UPDATE)
    let changes: Record<string, { from: unknown; to: unknown }> | undefined;
    if (action === AuditAction.UPDATE && before && after) {
      changes = this.calculateChanges(before, after);
    }

    return this.prisma.auditLog.create({
      data: {
        entity,
        entityId,
        action,
        before: before ? JSON.parse(JSON.stringify(before)) : undefined,
        after: after ? JSON.parse(JSON.stringify(after)) : undefined,
        changes: changes ? JSON.parse(JSON.stringify(changes)) : undefined,
        userId: context?.userId,
        userEmail: context?.userEmail,
        ipAddress: context?.ipAddress,
        userAgent: context?.userAgent,
        requestId: context?.requestId,
      },
    });
  }

  async logCreate(
    entity: string,
    entityId: string,
    data: Record<string, unknown>,
    context?: AuditContext,
  ) {
    return this.log({
      entity,
      entityId,
      action: AuditAction.CREATE,
      after: data,
      context,
    });
  }

  async logUpdate(
    entity: string,
    entityId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    context?: AuditContext,
  ) {
    return this.log({
      entity,
      entityId,
      action: AuditAction.UPDATE,
      before,
      after,
      context,
    });
  }

  async logDelete(
    entity: string,
    entityId: string,
    data: Record<string, unknown>,
    context?: AuditContext,
  ) {
    return this.log({
      entity,
      entityId,
      action: AuditAction.DELETE,
      before: data,
      context,
    });
  }

  private calculateChanges(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Record<string, { from: unknown; to: unknown }> {
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    // Get all keys from both objects
    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    for (const key of allKeys) {
      const oldValue = before[key];
      const newValue = after[key];

      // Skip if values are the same
      if (JSON.stringify(oldValue) === JSON.stringify(newValue)) {
        continue;
      }

      // Skip internal fields
      if (['updatedAt', 'createdAt'].includes(key)) {
        continue;
      }

      changes[key] = {
        from: oldValue,
        to: newValue,
      };
    }

    return changes;
  }

  async getLogsForEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
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
  }

  async getRecentLogs(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: {
        createdAt: 'desc',
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
  }
}
