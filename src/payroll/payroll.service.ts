import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payroll, PayrollDocument } from './payroll.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { CreatePayrollDto, UpdatePayrollDto, PayrollQueryDto } from './payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payroll.name) private payrollModel: Model<PayrollDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
  ) {}

  async findAll(query: PayrollQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const filter: Record<string, unknown> = {};
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);

    const [items, total] = await Promise.all([
      this.payrollModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.payrollModel.countDocuments(filter),
    ]);
    return { items: items.map(this.toRupees), total, page, limit };
  }

  async findMine(userId: string, query: PayrollQueryDto) {
    const karagar = await this.karagarModel.findOne({ userId: new Types.ObjectId(userId) }).lean();
    if (!karagar) return { items: [], total: 0, page: 1, limit: 100 };
    return this.findAll({ ...query, karagarId: (karagar._id as Types.ObjectId).toString() });
  }

  async findOne(id: string) {
    const payroll = await this.payrollModel.findById(id).lean();
    if (!payroll) throw new NotFoundException('Payroll not found.');
    return this.toRupees(payroll);
  }

  async create(dto: CreatePayrollDto) {
    const karagar = await this.karagarModel.findById(dto.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');

    const payroll = await this.payrollModel.create({
      karagarId: new Types.ObjectId(dto.karagarId),
      karagarName: karagar.name,
      periodStart: new Date(dto.periodStart),
      periodEnd: new Date(dto.periodEnd),
      paidPaise: Math.round(dto.paidRupees * 100),
      notes: dto.notes,
    });
    return this.toRupees(payroll.toObject());
  }

  async update(id: string, dto: UpdatePayrollDto) {
    const payroll = await this.payrollModel.findById(id);
    if (!payroll) throw new NotFoundException('Payroll not found.');

    if (dto.paidRupees !== undefined) payroll.paidPaise = Math.round(dto.paidRupees * 100);
    if (dto.notes !== undefined) payroll.notes = dto.notes;
    await payroll.save();
    return this.toRupees(payroll.toObject());
  }

  async remove(id: string) {
    await this.payrollModel.findByIdAndDelete(id);
  }

  private toRupees = (doc: Record<string, unknown>) => ({
    ...doc,
    paidRupees: ((doc['paidPaise'] as number) ?? 0) / 100,
  });
}
