import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { GeneratePayrollDto, ApprovePayrollDto, RecordPaymentDto, PayrollQueryDto } from './payroll.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Payroll')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payroll')
export class PayrollController {
  constructor(private readonly service: PayrollService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List payrolls' })
  async findAll(@Query() query: PayrollQueryDto) {
    return ApiResponse.ok(await this.service.findAll(query));
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payroll details' })
  async findOne(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.findOne(id));
  }

  @Post('generate')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Generate payroll for a karagar' })
  async generate(@Body() dto: GeneratePayrollDto, @CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.generate(dto, user.id), 'Payroll generated');
  }

  @Post(':id/approve')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Approve payroll with incentives/penalties' })
  async approve(
    @Param('id') id: string,
    @Body() dto: ApprovePayrollDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.approve(id, dto, user.id), 'Payroll approved');
  }

  @Post(':id/payment')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record payroll payment' })
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.recordPayment(id, dto, user.id), 'Payment recorded');
  }
}
