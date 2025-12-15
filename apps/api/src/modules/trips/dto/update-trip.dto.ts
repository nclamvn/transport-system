import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  IsEnum,
} from 'class-validator';
import { TripStatus } from '@prisma/client';

export class UpdateTripDto {
  @IsOptional()
  @IsString()
  driverId?: string;

  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  routeId?: string;

  @IsOptional()
  @IsString()
  originId?: string;

  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsOptional()
  @IsDateString()
  tripDate?: string;

  @IsOptional()
  @IsDateString()
  departureTime?: string;

  @IsOptional()
  @IsDateString()
  arrivalTime?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightLoaded?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightUnloaded?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weightFinal?: number;

  @IsOptional()
  @IsEnum(TripStatus)
  status?: TripStatus;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
