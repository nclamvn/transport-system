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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';
import { Roles, CurrentUser } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role } from '@prisma/client';

@Controller('vehicles')
@UseGuards(RolesGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR, Role.DRIVER)
  findAll(@Query('active') active?: string) {
    const isActive =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return this.vehiclesService.findAll({ isActive });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findById(@Param('id') id: string) {
    return this.vehiclesService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.vehiclesService.create(dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Put(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.vehiclesService.update(id, dto, {
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
    return this.vehiclesService.delete(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
