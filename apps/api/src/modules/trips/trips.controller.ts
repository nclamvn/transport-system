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
  ForbiddenException,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { TripsService } from './trips.service';
import { CreateTripDto, UpdateTripDto } from './dto';
import { Roles, CurrentUser, CurrentUserPayload, RequestId } from '@/common/decorators';
import { RolesGuard } from '@/common/guards';
import { Role, TripStatus, TripRecordType } from '@prisma/client';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

// Configure multer for file uploads
const storage = diskStorage({
  destination: './uploads/trips',
  filename: (_req, file, callback) => {
    const uniqueSuffix = uuidv4();
    callback(null, `${uniqueSuffix}${extname(file.originalname)}`);
  },
});

@Controller('trips')
@UseGuards(RolesGuard)
export class TripsController {
  constructor(private tripsService: TripsService) {}

  // Admin/Dispatcher/HR: List all trips
  @Get()
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findAll(
    @Query('status') status?: TripStatus,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('routeId') routeId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tripsService.findAll({
      status,
      driverId,
      vehicleId,
      routeId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // Admin/Dispatcher/HR: Review Queue - pending trips for review
  @Get('review-queue')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  getReviewQueue(
    @Query('status') status?: TripStatus,
    @Query('driverId') driverId?: string,
    @Query('vehicleId') vehicleId?: string,
    @Query('routeId') routeId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.tripsService.getReviewQueue({
      status,
      driverId,
      vehicleId,
      routeId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
    });
  }

  // Driver: List MY trips only (row-level enforced)
  @Get('my')
  @Roles(Role.DRIVER)
  findMyTrips(
    @CurrentUser('driverId') driverId: string,
    @Query('status') status?: TripStatus,
    @Query('limit') limit?: string,
  ) {
    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }
    // Row-level enforcement at service layer
    return this.tripsService.findByDriver(driverId, {
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
  }

  // Driver: Get single trip (row-level enforced)
  @Get('my/:id')
  @Roles(Role.DRIVER)
  findMyTripById(
    @Param('id') id: string,
    @CurrentUser('driverId') driverId: string,
  ) {
    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }
    // Row-level enforcement at service layer
    return this.tripsService.findByIdForDriver(id, driverId);
  }

  // Admin/Dispatcher/HR: Get any trip (with optional audit logs)
  @Get(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  findById(
    @Param('id') id: string,
    @Query('includeAudit') includeAudit?: string,
  ) {
    return this.tripsService.findById(id, includeAudit === 'true');
  }

  // Driver: Create trip for themselves (row-level enforced)
  @Post('my')
  @Roles(Role.DRIVER)
  createMyTrip(
    @Body() dto: CreateTripDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @CurrentUser('driverId') driverId: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }
    // Row-level enforcement: driver can only create for themselves
    return this.tripsService.createForDriver(dto, driverId, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Admin/Dispatcher: Create trip for any driver
  @Post()
  @Roles(Role.ADMIN, Role.DISPATCHER)
  create(
    @Body() dto: CreateTripDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.tripsService.create(dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Admin/Dispatcher: Update any trip
  @Put(':id')
  @Roles(Role.ADMIN, Role.DISPATCHER)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.tripsService.update(id, dto, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Driver: Submit MY trip for review (row-level enforced)
  @Post('my/:id/submit')
  @Roles(Role.DRIVER)
  submitMyTripForReview(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @CurrentUser('driverId') driverId: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }
    // Row-level enforcement at service layer
    return this.tripsService.submitForReviewByDriver(id, driverId, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Admin/Dispatcher: Submit any trip for review
  @Post(':id/submit')
  @Roles(Role.ADMIN, Role.DISPATCHER)
  submitForReview(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.tripsService.submitForReview(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Admin/Dispatcher/HR: Approve trip
  @Post(':id/approve')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  approve(
    @Param('id') id: string,
    @Body('weightFinal') weightFinal?: number,
    @CurrentUser('userId') userId?: string,
    @CurrentUser('email') email?: string,
    @RequestId() requestId?: string,
    @Req() req?: Request,
  ) {
    return this.tripsService.approve(id, weightFinal, {
      userId,
      userEmail: email,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      requestId,
    });
  }

  // Admin/Dispatcher/HR: Reject trip
  @Post(':id/reject')
  @Roles(Role.ADMIN, Role.DISPATCHER, Role.HR)
  reject(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('userId') userId?: string,
    @CurrentUser('email') email?: string,
    @RequestId() requestId?: string,
    @Req() req?: Request,
  ) {
    return this.tripsService.reject(id, reason, {
      userId,
      userEmail: email,
      ipAddress: req?.ip,
      userAgent: req?.get('user-agent'),
      requestId,
    });
  }

  // Admin: Delete trip (soft delete)
  @Delete(':id')
  @Roles(Role.ADMIN)
  delete(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
  ) {
    return this.tripsService.delete(id, {
      userId,
      userEmail: email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      requestId,
    });
  }

  // Driver: Upload attachment to MY trip (row-level enforced)
  @Post('my/:id/attachments')
  @Roles(Role.DRIVER)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadMyTripAttachment(
    @Param('id') tripId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @CurrentUser('driverId') driverId: string,
    @RequestId() requestId: string,
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('recordType') recordType: string,
    @Body('ticketNo') ticketNo?: string,
    @Body('weight') weight?: string,
    @Body('note') note?: string,
  ) {
    if (!driverId) {
      throw new ForbiddenException('Driver profile not found');
    }

    const parsedRecordType = (recordType as TripRecordType) || TripRecordType.PHOTO;

    return this.tripsService.addAttachmentForDriver(
      tripId,
      driverId,
      {
        recordType: parsedRecordType,
        fileUrl: `/uploads/trips/${file.filename}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        ticketNo,
        weight: weight ? parseFloat(weight) : undefined,
        note,
      },
      {
        userId,
        userEmail: email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId,
      },
    );
  }

  // Admin/Dispatcher: Upload attachment to any trip
  @Post(':id/attachments')
  @Roles(Role.ADMIN, Role.DISPATCHER)
  @UseInterceptors(FileInterceptor('file', { storage }))
  async uploadTripAttachment(
    @Param('id') tripId: string,
    @CurrentUser('userId') userId: string,
    @CurrentUser('email') email: string,
    @RequestId() requestId: string,
    @Req() req: Request,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|pdf)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
    @Body('recordType') recordType: string,
    @Body('ticketNo') ticketNo?: string,
    @Body('weight') weight?: string,
    @Body('note') note?: string,
  ) {
    const parsedRecordType = (recordType as TripRecordType) || TripRecordType.PHOTO;

    return this.tripsService.addAttachment(
      tripId,
      {
        recordType: parsedRecordType,
        fileUrl: `/uploads/trips/${file.filename}`,
        fileName: file.originalname,
        fileType: file.mimetype,
        ticketNo,
        weight: weight ? parseFloat(weight) : undefined,
        note,
      },
      {
        userId,
        userEmail: email,
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
        requestId,
      },
    );
  }
}
