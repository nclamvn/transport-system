import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  MinLength,
} from 'class-validator';

export class CreateRouteDto {
  @IsString()
  @MinLength(1)
  code: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsString()
  originId: string;

  @IsString()
  destinationId: string;

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
