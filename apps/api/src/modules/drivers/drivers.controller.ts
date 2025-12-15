import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { DriversService } from './drivers.service';
import { CreateDriverDto, UpdateDriverDto } from './dto';
import { Roles, CurrentUser } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role } from '@prisma/client';

@Controller('drivers')
@UseGuards(RolesGuard)
export class DriversController {
  constructor(private driversService: DriversService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findAll(@Query('active') active?: string) {
    const isActive =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return this.driversService.findAll({ isActive });
  }

  @Get('me')
  @Roles(Role.DRIVER)
  findMyProfile(@CurrentUser('driverId') driverId: string) {
    return this.driversService.findById(driverId);
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findById(@Param('id') id: string) {
    return this.driversService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.HR)
  create(
    @Body() dto: CreateDriverDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.driversService.create(dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.HR)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateDriverDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.driversService.update(id, dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.driversService.delete(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
