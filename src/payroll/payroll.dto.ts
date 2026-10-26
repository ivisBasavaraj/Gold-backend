import { IsString, IsNotEmpty, IsNumber, IsOptional, IsDateString, IsArray, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class GeneratePayrollDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  karagarId: string;

  @ApiProperty({ example: '2024-11-01' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ example: '2024-11-30' })
  @IsDateString()
  periodEnd: string;

  @ApiPropertyOptional({ description: 'Specific job IDs to include; omit to auto-include all completed jobs in period' })
  @IsOptional() @IsArray() @IsString({ each: true })
  jobIds?: string[];
}

export class ApprovePayrollDto {
  @ApiPropertyOptional({ description: 'Approved incentive in paise' })
  @IsOptional() @IsNumber() @Min(0)
  approvedIncentivePaise?: number;

  @ApiPropertyOptional({ description: 'Approved penalty in paise' })
  @IsOptional() @IsNumber() @Min(0)
  approvedPenaltyPaise?: number;

  @ApiPropertyOptional({ description: 'Authorized adjustment in paise (positive = bonus, negative = deduction)' })
  @IsOptional() @IsNumber()
  authorizedAdjustmentPaise?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class RecordPaymentDto {
  @ApiProperty({ description: 'Amount paid in paise' })
  @IsNumber() @Min(1)
  amountPaise: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class PayrollQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
