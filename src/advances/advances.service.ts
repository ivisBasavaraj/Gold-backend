import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { Advance, AdvanceDocument } from './advance.schema';
import { AdvanceRepayment, AdvanceRepaymentDocument } from './advance-repayment.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { CreateAdvanceDto, RecordRepaymentDto, AdvanceQueryDto } from './advance.dto';

@Injectable()
export class AdvancesService {
  constructor(
    @InjectModel(Advance.name) private advanceModel: Model<AdvanceDocument>,
    @InjectModel(AdvanceRepayment.name) private repaymentModel: Model<AdvanceRepaymentDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
  ) {}

  async findAll(query: AdvanceQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const filter: Record<string, unknown> = {};
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);
    if (query.fullyRepaid !== undefined) filter['fullyRepaid'] = query.fullyRepaid === 'true';

    const [items, total] = await Promise.all([
      this.advanceModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.advanceModel.countDocuments(filter),
    ]);
    return { items: items.map(this.toRupees), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const advance = await this.advanceModel.findById(id).lean();
    if (!advance) throw new NotFoundException('Advance not found.');
    const repayments = await this.repaymentModel.find({ advanceId: new Types.ObjectId(id) }).sort({ createdAt: 1 }).lean();
    return { ...this.toRupees(advance), repayments: repayments.map(this.toRupees) };
  }

  async getKaragarBalance(karagarId: string) {
    const agg = await this.advanceModel.aggregate([
      { $match: { karagarId: new Types.ObjectId(karagarId), fullyRepaid: false } },
      { $group: { _id: null, totalOutstandingPaise: { $sum: { $subtract: ['$amountPaise', '$repaidPaise'] } } } },
    ]);
    return { outstandingPaise: agg[0]?.totalOutstandingPaise ?? 0, outstandingRupees: (agg[0]?.totalOutstandingPaise ?? 0) / 100 };
  }

  async disburse(dto: CreateAdvanceDto, userId: string) {
    const karagar = await this.karagarModel.findById(dto.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');
    if (!karagar.isActive) throw new BadRequestException('Cannot disburse to inactive karagar.');

    const advance = await this.advanceModel.create({
      transactionId: `ADV-${uuidv4().slice(0, 8).toUpperCase()}`,
      karagarId: new Types.ObjectId(dto.karagarId),
      karagarName: karagar.name,
      amountPaise: dto.amountPaise,
      paymentMode: dto.paymentMode,
      purpose: dto.purpose,
      referenceNumber: dto.referenceNumber,
      disbursedBy: new Types.ObjectId(userId),
    });

    return this.toRupees(advance.toObject());
  }

  async recordRepayment(advanceId: string, dto: RecordRepaymentDto, userId: string) {
    const advance = await this.advanceModel.findById(advanceId);
    if (!advance) throw new NotFoundException('Advance not found.');
    if (advance.fullyRepaid) throw new BadRequestException('Advance already fully repaid.');

    const outstanding = advance.amountPaise - advance.repaidPaise;
    if (dto.amountPaise > outstanding) {
      throw new BadRequestException(`Repayment exceeds outstanding balance of ₹${(outstanding / 100).toFixed(2)}.`);
    }

    await this.repaymentModel.create({
      advanceId: new Types.ObjectId(advanceId),
      karagarId: advance.karagarId,
      amountPaise: dto.amountPaise,
      paymentMode: dto.paymentMode,
      notes: dto.notes,
      recordedBy: new Types.ObjectId(userId),
    });

    advance.repaidPaise += dto.amountPaise;
    if (advance.repaidPaise >= advance.amountPaise) advance.fullyRepaid = true;
    await advance.save();

    return this.toRupees(advance.toObject());
  }

  private toRupees(doc: Record<string, unknown>) {
    const result: Record<string, unknown> = { ...doc };
    if ('amountPaise' in doc) result['amountRupees'] = (doc['amountPaise'] as number) / 100;
    if ('repaidPaise' in doc) result['repaidRupees'] = (doc['repaidPaise'] as number) / 100;
    if ('outstandingPaise' in doc) result['outstandingRupees'] = (doc['outstandingPaise'] as number) / 100;
    return result;
  }
}
