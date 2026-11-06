import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PayrollService } from './payroll.service';
import { CreatePayrollDto, UpdatePayrollDto, PayrollQueryDto } from './payroll.dto';
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

  @Get('my')
  @Roles(UserRole.KARAGAR)
  @ApiOperation({ summary: 'List payrolls for the logged-in karagar' })
  async findMine(
    @Query() query: PayrollQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.findMine(user.id, query));
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get payroll' })
  async findOne(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.findOne(id));
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Create payroll record' })
  async create(@Body() dto: CreatePayrollDto) {
    return ApiResponse.ok(await this.service.create(dto), 'Payroll created');
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update payroll record' })
  async update(@Param('id') id: string, @Body() dto: UpdatePayrollDto) {
    return ApiResponse.ok(await this.service.update(id, dto), 'Payroll updated');
  }

  @Delete(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete payroll record' })
  async remove(@Param('id') id: string) {
    await this.service.remove(id);
    return ApiResponse.ok(null, 'Deleted');
  }
}
