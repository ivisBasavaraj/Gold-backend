import { IsString, IsNotEmpty, IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMode } from './advance.schema';

export class CreateAdvanceDto {
  @ApiProperty()
  @IsString() @IsNotEmpty()
  karagarId: string;

  @ApiPropertyOptional({ description: 'Amount in paise (preferred)' })
  @IsOptional() @IsNumber() @Min(1)
  amountPaise?: number;

  @ApiPropertyOptional({ description: 'Amount in rupees (converted to paise internally)' })
  @IsOptional() @IsNumber() @Min(0.01)
  amountRupees?: number;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  purpose?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  referenceNumber?: string;
}

export class RecordRepaymentDto {
  @ApiProperty({ description: 'Amount in paise' })
  @IsNumber() @Min(1)
  amountPaise: number;

  @ApiProperty({ enum: PaymentMode })
  @IsEnum(PaymentMode)
  paymentMode: PaymentMode;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}

export class AdvanceQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  karagarId?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  fullyRepaid?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}
