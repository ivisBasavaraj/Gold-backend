import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { JobStatus } from './job.schema';

export class CreateJobDto {
  @ApiProperty({ example: 'Bangle Work' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Bangles' })
  @IsOptional() @IsString()
  jewelryCategory?: string;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional() @IsNumber() @Min(1)
  pieceCount?: number;

  @ApiProperty({ example: 120000, description: 'Weight in milligrams' })
  @IsNumber() @Min(1)
  requiredWeightMg: number;

  @ApiPropertyOptional({ example: 0.916, description: 'Purity as decimal (0.916 = 22K)' })
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  purity?: number;

  @ApiPropertyOptional({ example: 'Group A' })
  @IsOptional() @IsString()
  meltingGroup?: string;

  @ApiPropertyOptional({ example: 25000, description: 'Labor rate per piece in paise' })
  @IsOptional() @IsNumber() @Min(0)
  laborRatePerPiecePaise?: number;

  @ApiPropertyOptional({ example: 2000, description: 'Wastage allowance in milligrams' })
  @IsOptional() @IsNumber() @Min(0)
  wastageAllowanceMg?: number;

  @ApiProperty({ example: 'karagar_id_here' })
  @IsString() @IsNotEmpty()
  karagarId: string;

  @ApiProperty({ example: '2024-12-31' })
  @IsDateString()
  dueDate: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class UpdateJobStatusDto {
  @ApiProperty({ enum: JobStatus })
  @IsEnum(JobStatus)
  status: JobStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class JobQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional({ enum: JobStatus }) @IsOptional() @IsString()
  status?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  meltingGroup?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
