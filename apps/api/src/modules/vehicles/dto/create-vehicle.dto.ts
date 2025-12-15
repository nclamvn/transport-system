import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  plateNo: string;

  @IsString()
  @MinLength(1)
  vehicleType: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  capacity?: number;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsNumber()
  year?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
