import {
  Injectable, NotFoundException, BadRequestException, ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument, JobStatus } from './job.schema';
import { JobStatusHistory, JobStatusHistoryDocument } from './job-status-history.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { CreateJobDto, UpdateJobStatusDto, JobQueryDto } from './job.dto';

// Valid state transitions
const TRANSITIONS: Record<JobStatus, JobStatus[]> = {
  [JobStatus.ASSIGNED]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
  [JobStatus.IN_PROGRESS]: [JobStatus.QUALITY_CHECK, JobStatus.CANCELLED],
  [JobStatus.QUALITY_CHECK]: [JobStatus.COMPLETED, JobStatus.IN_PROGRESS],
  [JobStatus.COMPLETED]: [],
  [JobStatus.CANCELLED]: [],
};

@Injectable()
export class JobsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(JobStatusHistory.name) private historyModel: Model<JobStatusHistoryDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
  ) {}

  async findAll(query: JobQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);
    if (query.status) filter['status'] = query.status;
    if (query.meltingGroup) filter['meltingGroup'] = query.meltingGroup;

    const [jobs, total] = await Promise.all([
      this.jobModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      this.jobModel.countDocuments(filter),
    ]);

    return { items: jobs.map(this.toGrams), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMyJobs(karagarUserId: string) {
    // Find karagar linked to this user
    const karagar = await this.karagarModel.findOne({ userId: new Types.ObjectId(karagarUserId) }).lean();
    if (!karagar) return [];
    const jobs = await this.jobModel
      .find({ karagarId: karagar._id, status: { $ne: JobStatus.CANCELLED } })
      .sort({ createdAt: -1 })
      .lean();
    return jobs.map(this.toGrams);
  }

  async findOne(id: string) {
    const job = await this.jobModel.findById(id).lean();
    if (!job) throw new NotFoundException('Job not found.');
    const history = await this.historyModel.find({ jobId: new Types.ObjectId(id) }).sort({ createdAt: 1 }).lean();
    return { ...this.toGrams(job), statusHistory: history };
  }

  async create(dto: CreateJobDto, userId: string) {
    const karagar = await this.karagarModel.findById(dto.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');
    if (!karagar.isActive) throw new BadRequestException('Cannot assign work to inactive karagar.');

    const jobNumber = await this.generateJobNumber();

    const job = await this.jobModel.create({
      ...dto,
      jobNumber,
      karagarId: new Types.ObjectId(dto.karagarId),
      karagarName: karagar.name,
      assignedBy: new Types.ObjectId(userId),
      dueDate: new Date(dto.dueDate),
      status: JobStatus.ASSIGNED,
    });

    return this.toGrams(job.toObject());
  }

  async updateStatus(id: string, dto: UpdateJobStatusDto, userId: string, userRole: string) {
    const job = await this.jobModel.findById(id);
    if (!job) throw new NotFoundException('Job not found.');

    const allowed = TRANSITIONS[job.status];
    if (!allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${job.status} to ${dto.status}.`,
      );
    }

    // Karagars can only move: assigned→inProgress, inProgress→qualityCheck
    if (userRole === 'karagar') {
      const karagarAllowed = [
        `${JobStatus.ASSIGNED}->${JobStatus.IN_PROGRESS}`,
        `${JobStatus.IN_PROGRESS}->${JobStatus.QUALITY_CHECK}`,
      ];
      if (!karagarAllowed.includes(`${job.status}->${dto.status}`)) {
        throw new ForbiddenException('You do not have permission to perform this status change.');
      }
    }

    const fromStatus = job.status;
    job.status = dto.status;
    await job.save();

    await this.historyModel.create({
      jobId: new Types.ObjectId(id),
      fromStatus,
      toStatus: dto.status,
      changedBy: new Types.ObjectId(userId),
      notes: dto.notes,
    });

    return this.toGrams(job.toObject());
  }

  private toGrams(job: Record<string, unknown>) {
    return {
      ...job,
      requiredWeightGrams: (job['requiredWeightMg'] as number) / 1000,
      wastageAllowanceGrams: (job['wastageAllowanceMg'] as number) / 1000,
      issuedWeightGrams: (job['totalIssuedMg'] as number) / 1000,
      returnedWeightGrams: (job['totalReturnedMg'] as number) / 1000,
      laborRatePerPiece: (job['laborRatePerPiecePaise'] as number) / 100,
    };
  }

  private async generateJobNumber(): Promise<string> {
    const count = await this.jobModel.countDocuments();
    return `JOB-${String(count + 1001).padStart(5, '0')}`;
  }
}
