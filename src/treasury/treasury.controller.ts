import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProperty,
  ApiPropertyOptional,
  ApiTags,
} from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { Types } from 'mongoose';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

class TreasuryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
}

class TreasuryAdjustmentDto {
  @ApiProperty({ description: 'true = add gold, false = remove gold' })
  @IsBoolean()
  isAdd!: boolean;

  @ApiProperty({
    description: 'Amount in milligrams (positive whole number)',
    example: 5000,
  })
  @IsInt()
  @Min(1)
  amountMg!: number;

  @ApiPropertyOptional({ description: 'Required when removing gold' })
  // Checked when removing gold, or when a non-empty note is supplied.
  // (Adding gold with an empty note is fine.)
  @ValidateIf(
    (o: TreasuryAdjustmentDto) =>
      o.isAdd === false || (o.note !== undefined && o.note !== ''),
  )
  @IsString()
  @Matches(/\S/, { message: 'Reason for removal is required' })
  @MaxLength(500)
  note?: string;
}

@ApiTags('Treasury')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('treasury')
export class TreasuryController {
  constructor(private readonly service: TreasuryService) {}

  @Get('summary')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get treasury vault summary' })
  async getSummary() {
    return ApiResponse.ok(await this.service.getSummary());
  }

  @Get('transactions')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List treasury transactions' })
  async getTransactions(@Query() query: TreasuryQueryDto) {
    const page = Math.max(parseInt(query.page ?? '1', 10) || 1, 1);
    const limit = Math.min(
      Math.max(parseInt(query.limit ?? '20', 10) || 20, 1),
      100,
    );
    return ApiResponse.ok(await this.service.getTransactions(page, limit));
  }

  @Post('adjustment')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Add or remove gold from treasury' })
  async adjust(
    @Body() dto: TreasuryAdjustmentDto,
    @CurrentUser() user: { id: string },
  ) {
    if (!user?.id || !Types.ObjectId.isValid(user.id)) {
      throw new UnauthorizedException('Invalid user session');
    }
    return ApiResponse.ok(
      await this.service.adjust(
        dto.amountMg,
        dto.isAdd,
        dto.note?.trim(),
        new Types.ObjectId(user.id),
      ),
    );
  }
}
