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
import { StationsService } from './stations.service';
import { CreateStationDto, UpdateStationDto } from './dto';
import { Roles, CurrentUser } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role, StationType } from '@prisma/client';

@Controller('stations')
@UseGuards(RolesGuard)
export class StationsController {
  constructor(private stationsService: StationsService) {}

  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR, Role.DRIVER)
  findAll(@Query('active') active?: string, @Query('type') type?: StationType) {
    const isActive =
      active === 'true' ? true : active === 'false' ? false : undefined;
    return this.stationsService.findAll({ isActive, type });
  }

  @Get(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findById(@Param('id') id: string) {
    return this.stationsService.findById(id);
  }

  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  create(
    @Body() dto: CreateStationDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.stationsService.create(dto, {
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
    @Body() dto: UpdateStationDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.stationsService.update(id, dto, {
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
    return this.stationsService.delete(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
