import {
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';

export class CreateTripDto {
  @IsString()
  driverId: string;

  @IsString()
  vehicleId: string;

  @IsString()
  routeId: string;

  @IsString()
  originId: string;

  @IsString()
  destinationId: string;

  @IsDateString()
  tripDate: string;

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
  @IsString()
  note?: string;
}
