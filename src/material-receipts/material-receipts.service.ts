import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { MaterialReceipt, MaterialReceiptDocument } from './material-receipt.schema';
import { Job, JobDocument } from '../jobs/job.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { TreasuryService } from '../treasury/treasury.service';
import { CreateReceiptDto, ReceiptQueryDto } from './material-receipt.dto';

@Injectable()
export class MaterialReceiptsService {
  constructor(
    @InjectModel(MaterialReceipt.name) private receiptModel: Model<MaterialReceiptDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
    private treasuryService: TreasuryService,
  ) {}

  async findAll(query: ReceiptQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const filter: Record<string, unknown> = {};
    if (query.jobId) filter['jobId'] = new Types.ObjectId(query.jobId);
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);

    const [items, total] = await Promise.all([
      this.receiptModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.receiptModel.countDocuments(filter),
    ]);
    return { items: items.map(this.toGrams), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async create(dto: CreateReceiptDto, userId: string) {
    const job = await this.jobModel.findById(dto.jobId);
    if (!job) throw new NotFoundException('Job not found.');

    const karagar = await this.karagarModel.findById(job.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');

    const pureGoldEquivalentMg = Math.round(dto.physicalWeightMg * dto.purity);

    const receipt = await this.receiptModel.create({
      transactionId: `REC-${uuidv4().slice(0, 8).toUpperCase()}`,
      jobId: new Types.ObjectId(dto.jobId),
      karagarId: job.karagarId,
      karagarName: karagar.name,
      receiptType: dto.receiptType,
      physicalWeightMg: dto.physicalWeightMg,
      purity: dto.purity,
      pureGoldEquivalentMg,
      meltingGroup: job.meltingGroup,
      authorizedBy: new Types.ObjectId(userId),
      scaleImageUrl: dto.scaleImageUrl,
      notes: dto.notes,
    });

    // Update job running total
    await this.jobModel.findByIdAndUpdate(dto.jobId, {
      $inc: { totalReturnedMg: dto.physicalWeightMg },
    });

    // Record treasury credit
    await this.treasuryService.recordReceipt(
      dto.physicalWeightMg,
      receipt._id as Types.ObjectId,
      new Types.ObjectId(userId),
    );

    return this.toGrams(receipt.toObject());
  }

  async reverse(id: string, userId: string) {
    const receipt = await this.receiptModel.findById(id);
    if (!receipt) throw new NotFoundException('Receipt not found.');
    if (receipt.reversed) throw new BadRequestException('Already reversed.');

    receipt.reversed = true;
    await receipt.save();

    await this.jobModel.findByIdAndUpdate(receipt.jobId, {
      $inc: { totalReturnedMg: -receipt.physicalWeightMg },
    });

    await this.treasuryService.recordIssuance(
      receipt.physicalWeightMg,
      receipt._id as Types.ObjectId,
      new Types.ObjectId(userId),
    );

    return this.toGrams(receipt.toObject());
  }

  private toGrams(doc: Record<string, unknown>) {
    return {
      ...doc,
      physicalWeightGrams: (doc['physicalWeightMg'] as number) / 1000,
      pureGoldEquivalentGrams: (doc['pureGoldEquivalentMg'] as number) / 1000,
    };
  }
}
