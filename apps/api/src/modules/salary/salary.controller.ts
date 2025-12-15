import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  Res,
  Header,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { SalaryService } from './salary.service';
import { CreatePeriodDto, CreateRuleDto } from './dto';
import { Roles, CurrentUser, RequestId } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role, SalaryPeriodStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

@Controller('salary')
@UseGuards(RolesGuard)
export class SalaryController {
  constructor(private salaryService: SalaryService) {}

  // ===================== PERIODS =====================

  // List all periods
  @Get('periods')
  @Roles(Role.ADMIN, Role.HR)
  listPeriods(
    @Query('status') status?: SalaryPeriodStatus,
    @Query('limit') limit?: string,
  ) {
    return this.salaryService.listPeriods({
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Create period
  @Post('periods')
  @Roles(Role.ADMIN, Role.HR)
  createPeriod(
    @Body() dto: CreatePeriodDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.salaryService.createPeriod(dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Get period detail
  @Get('periods/:id')
  @Roles(Role.ADMIN, Role.HR)
  getPeriod(@Param('id') id: string) {
    return this.salaryService.getPeriodById(id);
  }

  // Recalculate period
  @Post('periods/:id/recalculate')
  @Roles(Role.ADMIN, Role.HR)
  recalculate(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.salaryService.recalculate(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Get results
  @Get('periods/:id/results')
  @Roles(Role.ADMIN, Role.HR)
  getResults(
    @Param('id') id: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.salaryService.getResults(id, driverId);
  }

  // Get driver result detail
  @Get('periods/:id/results/:driverId')
  @Roles(Role.ADMIN, Role.HR)
  getDriverResult(
    @Param('id') periodId: string,
    @Param('driverId') driverId: string,
  ) {
    return this.salaryService.getDriverResult(periodId, driverId);
  }

  // Close period
  @Post('periods/:id/close')
  @Roles(Role.ADMIN, Role.HR)
  closePeriod(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.salaryService.closePeriod(id, userId, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Export to Excel
  @Get('periods/:id/export.xlsx')
  @Roles(Role.ADMIN, Role.HR)
  @Header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  async exportExcel(
    @Param('id') id: string,
    @Res() res: Response,
  ) {
    const data = await this.salaryService.getExportData(id);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Transport System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Salary Results');

    // Title
    sheet.mergeCells('A1:E1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = `BANG LUONG - ${data.period.name}`;
    titleCell.font = { bold: true, size: 14 };
    titleCell.alignment = { horizontal: 'center' };

    // Period info
    sheet.mergeCells('A2:E2');
    sheet.getCell('A2').value = `Ky: ${data.period.code} (${new Date(data.period.start).toLocaleDateString('vi-VN')} - ${new Date(data.period.end).toLocaleDateString('vi-VN')})`;

    // Headers
    const headerRow = sheet.addRow(['Ma NV', 'Ho ten', 'So chuyen', 'Tong tan', 'Thanh tien (VND)']);
    headerRow.font = { bold: true };
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };
    });

    // Data rows
    for (const row of data.data) {
      const dataRow = sheet.addRow([
        row.employeeCode,
        row.driverName,
        row.totalTrips,
        row.totalWeight.toFixed(2),
        row.totalAmount.toLocaleString('vi-VN'),
      ]);
      dataRow.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' },
        };
      });
    }

    // Summary row
    sheet.addRow([]);
    const summaryRow = sheet.addRow([
      'TONG',
      '',
      data.summary.totalTrips,
      data.summary.totalWeight.toFixed(2),
      data.summary.totalAmount.toLocaleString('vi-VN'),
    ]);
    summaryRow.font = { bold: true };

    // Column widths
    sheet.getColumn(1).width = 15;
    sheet.getColumn(2).width = 25;
    sheet.getColumn(3).width = 12;
    sheet.getColumn(4).width = 15;
    sheet.getColumn(5).width = 20;

    // Set response headers
    res.setHeader(
      'Content-Disposition',
      `attachment; filename=salary_${data.period.code}.xlsx`,
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  }

  // ===================== RULES =====================

  // List rules
  @Get('rules')
  @Roles(Role.ADMIN, Role.HR)
  listRules(@Query('activeOnly') activeOnly?: string) {
    return this.salaryService.listRules({
      activeOnly: activeOnly === 'true',
    });
  }

  // Create rule
  @Post('rules')
  @Roles(Role.ADMIN)
  createRule(
    @Body() dto: CreateRuleDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.salaryService.createRule(dto, userId, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }
}
