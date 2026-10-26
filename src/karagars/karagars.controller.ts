import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KaragarsService } from './karagars.service';
import { CreateKaragarDto, UpdateKaragarDto, KaragarQueryDto } from './karagar.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Karagars')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('karagars')
export class KaragarsController {
  constructor(private readonly service: KaragarsService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all karagars with custody stats' })
  async findAll(@Query() query: KaragarQueryDto) {
    const result = await this.service.findAll(query);
    return ApiResponse.ok(result);
  }

  @Get(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get karagar profile with full stats' })
  async findOne(@Param('id') id: string) {
    const result = await this.service.findOne(id);
    return ApiResponse.ok(result);
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Register a new karagar' })
  async create(@Body() dto: CreateKaragarDto) {
    const result = await this.service.create(dto);
    return ApiResponse.ok(result, 'Karagar registered successfully');
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Update karagar profile' })
  async update(@Param('id') id: string, @Body() dto: UpdateKaragarDto) {
    const result = await this.service.update(id, dto);
    return ApiResponse.ok(result, 'Karagar updated successfully');
  }
}
