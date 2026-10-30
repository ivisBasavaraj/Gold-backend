import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaterialIssuanceService } from './material-issuance.service';
import { CreateIssuanceDto, ReverseIssuanceDto, IssuanceQueryDto } from './material-issuance.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Material Issuance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('material-issuance')
export class MaterialIssuanceController {
  constructor(private readonly service: MaterialIssuanceService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List issuances' })
  async findAll(@Query() query: IssuanceQueryDto) {
    return ApiResponse.ok(await this.service.findAll(query));
  }

  @Get('my')
  @Roles(UserRole.KARAGAR)
  @ApiOperation({ summary: 'List issuances for the logged-in karagar' })
  async findMine(
    @Query() query: IssuanceQueryDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.findMine(user.id, query));
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Issue gold to karagar for a job' })
  async create(@Body() dto: CreateIssuanceDto, @CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.create(dto, user.id), 'Gold issued successfully');
  }

  @Post(':id/reverse')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reverse an issuance' })
  async reverse(
    @Param('id') id: string,
    @Body() dto: ReverseIssuanceDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.reverse(id, dto, user.id), 'Issuance reversed');
  }
}
