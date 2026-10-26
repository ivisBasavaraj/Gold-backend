import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.MANAGER, UserRole.ADMIN)
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Overall dashboard summary' })
  async dashboard() {
    return ApiResponse.ok(await this.service.getDashboardSummary());
  }

  @Get('karagar/:id')
  @ApiOperation({ summary: 'Full report for a single karagar' })
  async karagarReport(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.getKaragarReport(id));
  }

  @Get('melting-groups')
  @ApiOperation({ summary: 'Summary by melting group' })
  async meltingGroups() {
    return ApiResponse.ok(await this.service.getMeltingGroupReport());
  }
}
