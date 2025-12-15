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
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './dto';
import { Roles, CurrentUser } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  findAll(@Query('active') active?: string) {
    const isActive = active === 'true' ? true : active === 'false' ? false : undefined;
    return this.usersService.findAll({ isActive });
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post()
  create(
    @Body() dto: CreateUserDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.usersService.create(dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.usersService.update(id, dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @Req() req: Request,
  ) {
    return this.usersService.delete(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
  }
}
