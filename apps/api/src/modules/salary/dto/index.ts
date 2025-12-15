import { IsString, IsDateString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { SalaryPeriodStatus } from '@prisma/client';

export class CreatePeriodDto {
  @IsString()
  name: string;

  @IsDateString()
  periodStart: string;

  @IsDateString()
  periodEnd: string;
}

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  ratePerTon: number;

  @IsDateString()
  effectiveFrom: string;

  @IsOptional()
  @IsDateString()
  effectiveTo?: string;

  @IsOptional()
  @IsString()
  routeId?: string;
}
