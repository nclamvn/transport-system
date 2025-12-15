import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  MinLength,
} from 'class-validator';
import { StationType } from '@prisma/client';

export class UpdateStationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  code?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(StationType)
  type?: StationType;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsNumber()
  lat?: number;

  @IsOptional()
  @IsNumber()
  lng?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
