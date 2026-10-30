import { IsString, IsNotEmpty, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIssuanceDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  jobId: string;

  @ApiProperty({ description: 'Physical weight in milligrams' })
  @IsNumber() @Min(1)
  physicalWeightMg: number;

  @ApiPropertyOptional({ example: 1.0, description: 'Purity as decimal, defaults to 1.0' })
  @IsOptional() @IsNumber() @Min(0) @Max(1)
  purity?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  scaleImageUrl?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsNumber()
  ocrExtractedWeightMg?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class ReverseIssuanceDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  reason: string;
}

export class IssuanceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  jobId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
