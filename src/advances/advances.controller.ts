import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AdvancesService } from './advances.service';
import { CreateAdvanceDto, RecordRepaymentDto, AdvanceQueryDto } from './advance.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Advances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('advances')
export class AdvancesController {
  constructor(private readonly service: AdvancesService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List advances' })
  async findAll(@Query() query: AdvanceQueryDto) {
    return ApiResponse.ok(await this.service.findAll(query));
  }

  @Get('karagar/:karagarId/balance')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get outstanding advance balance for a karagar' })
  async getBalance(@Param('karagarId') karagarId: string) {
    return ApiResponse.ok(await this.service.getKaragarBalance(karagarId));
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get advance with repayment history' })
  async findOne(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.findOne(id));
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Disburse advance to karagar' })
  async disburse(@Body() dto: CreateAdvanceDto, @CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.disburse(dto, user.id), 'Advance disbursed successfully');
  }

  @Post(':id/repayment')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record advance repayment' })
  async recordRepayment(
    @Param('id') id: string,
    @Body() dto: RecordRepaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.recordRepayment(id, dto, user.id), 'Repayment recorded');
  }
}
