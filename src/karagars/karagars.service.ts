import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Karagar, KaragarDocument } from './karagar.schema';
import { MaterialIssuance, MaterialIssuanceDocument } from '../material-issuance/material-issuance.schema';
import { MaterialReceipt, MaterialReceiptDocument } from '../material-receipts/material-receipt.schema';
import { Job, JobDocument, JobStatus } from '../jobs/job.schema';
import { CreateKaragarDto, UpdateKaragarDto, KaragarQueryDto } from './karagar.dto';

@Injectable()
export class KaragarsService {
  constructor(
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
    @InjectModel(MaterialIssuance.name) private issuanceModel: Model<MaterialIssuanceDocument>,
    @InjectModel(MaterialReceipt.name) private receiptModel: Model<MaterialReceiptDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
  ) {}

  async findAll(query: KaragarQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const skip = (page - 1) * limit;

    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter['$or'] = [
        { name: { $regex: query.search, $options: 'i' } },
        { employeeCode: { $regex: query.search, $options: 'i' } },
      ];
    }
    if (query.meltingGroup) filter['meltingGroup'] = query.meltingGroup;
    if (query.isActive !== undefined) filter['isActive'] = query.isActive === 'true';

    const [karagars, total] = await Promise.all([
      this.karagarModel.find(filter).skip(skip).limit(limit).lean(),
      this.karagarModel.countDocuments(filter),
    ]);

    const enriched = await Promise.all(karagars.map(k => this.enrichWithStats(k)));

    return {
      items: enriched,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string) {
    const karagar = await this.karagarModel.findById(id).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');
    return this.enrichWithStats(karagar);
  }

  async create(dto: CreateKaragarDto) {
    const exists = await this.karagarModel.findOne({ employeeCode: dto.employeeCode.toUpperCase() });
    if (exists) throw new ConflictException(`Employee code ${dto.employeeCode} already exists.`);
    const karagar = await this.karagarModel.create({
      ...dto,
      employeeCode: dto.employeeCode.toUpperCase(),
    });
    return karagar.toObject();
  }

  async update(id: string, dto: UpdateKaragarDto) {
    const karagar = await this.karagarModel.findByIdAndUpdate(id, dto, { new: true }).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');
    return karagar;
  }

  private async enrichWithStats(karagar: Record<string, unknown>) {
    const kId = new Types.ObjectId(karagar['_id'] as string);

    const [issuanceAgg, receiptAgg, activeJobCount] = await Promise.all([
      this.issuanceModel.aggregate([
        { $match: { karagarId: kId, reversed: false } },
        { $group: { _id: null, total: { $sum: '$physicalWeightMg' } } },
      ]),
      this.receiptModel.aggregate([
        { $match: { karagarId: kId, reversed: false } },
        { $group: { _id: null, total: { $sum: '$physicalWeightMg' } } },
      ]),
      this.jobModel.countDocuments({
        karagarId: kId,
        status: { $in: [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.QUALITY_CHECK] },
      }),
    ]);

    const totalIssuedMg: number = issuanceAgg[0]?.total ?? 0;
    const totalReturnedMg: number = receiptAgg[0]?.total ?? 0;

    return {
      ...karagar,
      totalIssuedGrams: totalIssuedMg / 1000,
      totalReturnedGrams: totalReturnedMg / 1000,
      outstandingCustodyGrams: (totalIssuedMg - totalReturnedMg) / 1000,
      activeJobCount,
    };
  }
}
