import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class CreateDriverDto {
  @IsString()
  @MinLength(1)
  employeeCode: string;

  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  licenseNo?: string;

  @IsOptional()
  @IsString()
  licenseType?: string;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
