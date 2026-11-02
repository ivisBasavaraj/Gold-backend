import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, IsDateString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JobStatus } from './job.schema';

export class CreateJobDto {
  @ApiProperty({ example: 'Bangle Work' })
  @IsString() @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 120000, description: 'Weight in milligrams' })
  @IsNumber() @Min(1)
  requiredWeightMg: number;

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
