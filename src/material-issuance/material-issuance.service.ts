import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MaterialIssuance, MaterialIssuanceDocument } from './material-issuance.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { TreasuryService } from '../treasury/treasury.service';
import { CreateIssuanceDto, ReverseIssuanceDto, IssuanceQueryDto } from './material-issuance.dto';

@Injectable()
export class MaterialIssuanceService {
  constructor(
    @InjectModel(MaterialIssuance.name) private issuanceModel: Model<MaterialIssuanceDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
    private treasuryService: TreasuryService,
  ) {}

  async findAll(query: IssuanceQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const filter: Record<string, unknown> = {};
    if (query.jobId) filter['jobId'] = new Types.ObjectId(query.jobId);
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);

    const [items, total] = await Promise.all([
      this.issuanceModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.issuanceModel.countDocuments(filter),
    ]);
    return { items: items.map(this.toGrams), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findMine(userId: string, query: IssuanceQueryDto) {
    const karagar = await this.karagarModel.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!karagar) return { items: [], total: 0, page: 1, limit: 100, totalPages: 0 };
    return this.findAll({ ...query, karagarId: (karagar._id as Types.ObjectId).toString() });
  }

  async create(dto: CreateIssuanceDto, userId: string) {
    const job = await this.jobModel.findById(dto.jobId);
    if (!job) throw new NotFoundException('Job not found.');

    const karagar = await this.karagarModel.findById(job.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');

    const purity = dto.purity ?? 1.0;
    const pureGoldEquivalentMg = Math.round(dto.physicalWeightMg * purity);

    const issuance = await this.issuanceModel.create({
      transactionId: `ISS-${uuidv4().slice(0, 8).toUpperCase()}`,
      jobId: new Types.ObjectId(dto.jobId),
      karagarId: job.karagarId,
      karagarName: karagar.name,
      physicalWeightMg: dto.physicalWeightMg,
      purity,
      pureGoldEquivalentMg,
      meltingGroup: job.meltingGroup,
      authorizedBy: new Types.ObjectId(userId),
      scaleImageUrl: dto.scaleImageUrl,
      ocrExtractedWeightMg: dto.ocrExtractedWeightMg,
      notes: dto.notes,
    });

    // Update job running total
    await this.jobModel.findByIdAndUpdate(dto.jobId, {
      $inc: { totalIssuedMg: dto.physicalWeightMg },
    });

    // Record treasury debit
    await this.treasuryService.recordIssuance(
      dto.physicalWeightMg,
      issuance._id as Types.ObjectId,
      new Types.ObjectId(userId),
    );

    return this.toGrams(issuance.toObject());
  }

  async reverse(id: string, dto: ReverseIssuanceDto, userId: string) {
    const issuance = await this.issuanceModel.findById(id);
    if (!issuance) throw new NotFoundException('Issuance not found.');
    if (issuance.reversed) throw new BadRequestException('Already reversed.');

    issuance.reversed = true;
    issuance.reversalReason = dto.reason;
    await issuance.save();

    // Undo job running total
    await this.jobModel.findByIdAndUpdate(issuance.jobId, {
      $inc: { totalIssuedMg: -issuance.physicalWeightMg },
    });

    // Credit treasury back
    await this.treasuryService.recordReceipt(
      issuance.physicalWeightMg,
      issuance._id as Types.ObjectId,
      new Types.ObjectId(userId),
    );

    return this.toGrams(issuance.toObject());
  }

  private toGrams = (doc: Record<string, unknown>) => {
    return {
      ...doc,
      physicalWeightGrams: (doc['physicalWeightMg'] as number) / 1000,
      pureGoldEquivalentGrams: (doc['pureGoldEquivalentMg'] as number) / 1000,
    };
  };
}
