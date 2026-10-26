import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export class CreateKaragarDto {
  @ApiProperty({ example: 'Raju Kumar' })
  @IsString() @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'GC-001' })
  @IsString() @IsNotEmpty()
  employeeCode: string;

  @ApiProperty({ example: 'Group A' })
  @IsString() @IsNotEmpty()
  meltingGroup: string;

  @ApiProperty({ example: 'Bangles & Chains' })
  @IsString() @IsNotEmpty()
  specialization: string;

  @ApiPropertyOptional({ example: '9876543210' })
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  address?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateKaragarDto extends PartialType(CreateKaragarDto) {
  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}

export class KaragarQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  search?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  meltingGroup?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  isActive?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
