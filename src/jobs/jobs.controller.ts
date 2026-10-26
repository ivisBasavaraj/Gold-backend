import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { CreateJobDto, UpdateJobStatusDto, JobQueryDto } from './job.dto';
import { JwtAuthGuard, RolesGuard } from '../common/guards/auth.guard';
import { Roles, UserRole } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ApiResponse } from '../common/dto/api-response.dto';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly service: JobsService) {}

  @Get()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'List all jobs' })
  async findAll(@Query() query: JobQueryDto) {
    return ApiResponse.ok(await this.service.findAll(query));
  }

  @Get('my-jobs')
  @Roles(UserRole.KARAGAR)
  @ApiOperation({ summary: 'Get jobs assigned to current karagar' })
  async myJobs(@CurrentUser() user: { id: string }) {
    return ApiResponse.ok(await this.service.findMyJobs(user.id));
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get job details with status history' })
  async findOne(@Param('id') id: string) {
    return ApiResponse.ok(await this.service.findOne(id));
  }

  @Post()
  @Roles(UserRole.MANAGER, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a new job to a karagar' })
  async create(
    @Body() dto: CreateJobDto,
    @CurrentUser() user: { id: string },
  ) {
    return ApiResponse.ok(await this.service.create(dto, user.id), 'Job assigned successfully');
  }

  @Post(':id/status')
  @ApiOperation({ summary: 'Update job status' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateJobStatusDto,
    @CurrentUser() user: { id: string; role: string },
  ) {
    return ApiResponse.ok(
      await this.service.updateStatus(id, dto, user.id, user.role),
      'Job status updated',
    );
  }
}
