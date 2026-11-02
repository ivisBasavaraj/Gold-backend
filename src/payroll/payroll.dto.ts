import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  karagarId: string;

  @ApiProperty({ example: '2024-11-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2024-11-30' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ description: 'Amount paid in rupees' })
  @IsNumber() @Min(0)
  paidRupees: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdatePayrollDto {
  @ApiPropertyOptional()
  @IsOptional() @IsNumber() @Min(0)
  paidRupees?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class PayrollQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
