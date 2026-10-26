import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TreasuryService } from './treasury.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

class TreasuryQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString()
  page?: string;

  @ApiPropertyOptional() @IsOptional() @IsString()
  limit?: string;
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
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    return ApiResponse.ok(await this.service.getTransactions(page, limit));
  }
}
