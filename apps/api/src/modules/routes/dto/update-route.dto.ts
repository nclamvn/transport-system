import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateRouteDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  originId?: string;

  @IsOptional()
  @IsString()
  destinationId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  distance?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  defaultRatePerTon?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
