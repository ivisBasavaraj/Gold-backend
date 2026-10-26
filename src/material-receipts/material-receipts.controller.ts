import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MaterialReceiptsService } from './material-receipts.service';
import { CreateReceiptDto, ReceiptQueryDto } from './material-receipt.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Material Receipts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('material-receipts')
export class MaterialReceiptsController {
  constructor(private readonly service: MaterialReceiptsService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List receipts' })
  async findAll(@Query() query: ReceiptQueryDto) {
    return ApiResponse.ok(await this.service.findAll(query));
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Record gold receipt from karagar' })
  async create(@Body() dto: CreateReceiptDto, @CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.create(dto, user.id), 'Receipt recorded successfully');
  }

  @Post(':id/reverse')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Reverse a receipt' })
  async reverse(@Param('id') id: string, @CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.reverse(id, user.id), 'Receipt reversed');
  }
}
