import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditService } from './audit.service';
import { Roles } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role } from '@prisma/client';

@Controller('audit')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN, Role.HR)
export class AuditController {
  constructor(private auditService: AuditService) {}

  @Get('recent')
  getRecentLogs(@Query('limit') limit?: string) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    return this.auditService.getRecentLogs(parsedLimit);
  }

  @Get(':entity/:entityId')
  getLogsForEntity(
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getLogsForEntity(entity, entityId);
  }
}
