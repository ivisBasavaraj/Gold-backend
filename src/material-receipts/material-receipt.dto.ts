import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReceiptType } from './material-receipt.schema';

export class CreateReceiptDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  jobId: string;

  @ApiProperty({ enum: ReceiptType })
  @IsEnum(ReceiptType)
  receiptType: ReceiptType;

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
  @IsOptional() @IsString()
  notes?: string;
}

export class ReceiptQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  jobId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
