import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Payroll, PayrollDocument, PayrollStatus, WastageStatus } from './payroll.schema';
import { Job, JobDocument, JobStatus } from '../jobs/job.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { Advance, AdvanceDocument } from '../advances/advance.schema';
import { GeneratePayrollDto, ApprovePayrollDto, RecordPaymentDto, PayrollQueryDto } from './payroll.dto';

@Injectable()
export class PayrollService {
  constructor(
    @InjectModel(Payroll.name) private payrollModel: Model<PayrollDocument>,
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
    @InjectModel(Advance.name) private advanceModel: Model<AdvanceDocument>,
  ) {}

  async findAll(query: PayrollQueryDto) {
    const page = parseInt(query.page ?? '1', 10);
    const limit = parseInt(query.limit ?? '20', 10);
    const filter: Record<string, unknown> = {};
    if (query.karagarId) filter['karagarId'] = new Types.ObjectId(query.karagarId);
    if (query.status) filter['status'] = query.status;

    const [items, total] = await Promise.all([
      this.payrollModel.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      this.payrollModel.countDocuments(filter),
    ]);
    return { items: items.map(this.toRupees), total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(id: string) {
    const payroll = await this.payrollModel.findById(id).lean();
    if (!payroll) throw new NotFoundException('Payroll not found.');
    return this.toRupees(payroll);
  }

  async generate(dto: GeneratePayrollDto, userId: string) {
    const karagar = await this.karagarModel.findById(dto.karagarId).lean();
    if (!karagar) throw new NotFoundException('Karagar not found.');

    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    periodEnd.setHours(23, 59, 59, 999);

    // Find completed jobs in period
    const jobFilter: Record<string, unknown> = {
      karagarId: new Types.ObjectId(dto.karagarId),
      status: JobStatus.COMPLETED,
      updatedAt: { $gte: periodStart, $lte: periodEnd },
    };
    if (dto.jobIds?.length) {
      jobFilter['_id'] = { $in: dto.jobIds.map(id => new Types.ObjectId(id)) };
    }

    const jobs = await this.jobModel.find(jobFilter).lean();
    if (!jobs.length) throw new BadRequestException('No completed jobs found for this period.');

    // Calculate labor
    let grossLaborPaise = 0;
    let actualWastageMg = 0;
    let allowedWastageMg = 0;

    for (const job of jobs) {
      grossLaborPaise += job.laborRatePerPiecePaise * job.pieceCount;
      allowedWastageMg += job.wastageAllowanceMg;
      const jobWastage = job.totalIssuedMg - job.totalReturnedMg - job.requiredWeightMg;
      if (jobWastage > 0) actualWastageMg += jobWastage;
    }

    // Determine wastage status
    let wastageStatus = WastageStatus.WITHIN_ALLOWANCE;
    if (actualWastageMg < allowedWastageMg * 0.9) wastageStatus = WastageStatus.BELOW_ALLOWANCE;
    else if (actualWastageMg > allowedWastageMg) wastageStatus = WastageStatus.ABOVE_ALLOWANCE;

    // Outstanding advance balance
    const advanceAgg = await this.advanceModel.aggregate([
      { $match: { karagarId: new Types.ObjectId(dto.karagarId), fullyRepaid: false } },
      { $group: { _id: null, total: { $sum: { $subtract: ['$amountPaise', '$repaidPaise'] } } } },
    ]);
    const advanceDeductionPaise = advanceAgg[0]?.total ?? 0;

    const netPayablePaise = grossLaborPaise - advanceDeductionPaise;

    const payroll = await this.payrollModel.create({
      karagarId: new Types.ObjectId(dto.karagarId),
      karagarName: karagar.name,
      periodStart,
      periodEnd,
      jobsDone: jobs.length,
      grossLaborPaise,
      advanceDeductionPaise,
      netPayablePaise: Math.max(0, netPayablePaise),
      wastageStatus,
      actualWastageMg,
      allowedWastageMg,
      includedJobIds: jobs.map(j => j._id),
      status: PayrollStatus.DRAFT,
    });

    return this.toRupees(payroll.toObject());
  }

  async approve(id: string, dto: ApprovePayrollDto, userId: string) {
    const payroll = await this.payrollModel.findById(id);
    if (!payroll) throw new NotFoundException('Payroll not found.');
    if (payroll.status !== PayrollStatus.DRAFT && payroll.status !== PayrollStatus.UNDER_REVIEW) {
      throw new BadRequestException('Only draft or under-review payrolls can be approved.');
    }

    const incentive = dto.approvedIncentivePaise ?? 0;
    const penalty = dto.approvedPenaltyPaise ?? 0;
    const adjustment = dto.authorizedAdjustmentPaise ?? 0;

    payroll.approvedIncentivePaise = incentive;
    payroll.approvedPenaltyPaise = penalty;
    payroll.authorizedAdjustmentPaise = adjustment;
    payroll.netPayablePaise = Math.max(
      0,
      payroll.grossLaborPaise + incentive - penalty + adjustment - payroll.advanceDeductionPaise,
    );
    payroll.status = PayrollStatus.APPROVED;
    payroll.approvedBy = new Types.ObjectId(userId);
    payroll.approvedAt = new Date();
    if (dto.notes) payroll.notes = dto.notes;

    // Update wastage status if incentive/penalty applied
    if (incentive > 0) payroll.wastageStatus = WastageStatus.INCENTIVE_APPROVED;
    if (penalty > 0) payroll.wastageStatus = WastageStatus.PENALTY_APPROVED;

    await payroll.save();
    return this.toRupees(payroll.toObject());
  }

  async recordPayment(id: string, dto: RecordPaymentDto, userId: string) {
    const payroll = await this.payrollModel.findById(id);
    if (!payroll) throw new NotFoundException('Payroll not found.');
    if (payroll.status !== PayrollStatus.APPROVED && payroll.status !== PayrollStatus.PARTIALLY_PAID) {
      throw new BadRequestException('Payroll must be approved before recording payment.');
    }

    const remaining = payroll.netPayablePaise - payroll.paidPaise;
    if (dto.amountPaise > remaining) {
      throw new BadRequestException(`Payment exceeds remaining balance of ₹${(remaining / 100).toFixed(2)}.`);
    }

    payroll.paidPaise += dto.amountPaise;
    payroll.status = payroll.paidPaise >= payroll.netPayablePaise ? PayrollStatus.PAID : PayrollStatus.PARTIALLY_PAID;

    // Deduct from advances if advance was included
    if (payroll.advanceDeductionPaise > 0) {
      await this.settleAdvances(payroll.karagarId, payroll.advanceDeductionPaise, userId);
    }

    await payroll.save();
    return this.toRupees(payroll.toObject());
  }

  private async settleAdvances(karagarId: Types.ObjectId, totalDeductionPaise: number, _userId: string) {
    const advances = await this.advanceModel
      .find({ karagarId, fullyRepaid: false })
      .sort({ createdAt: 1 });

    let remaining = totalDeductionPaise;
    for (const advance of advances) {
      if (remaining <= 0) break;
      const outstanding = advance.amountPaise - advance.repaidPaise;
      const deduct = Math.min(outstanding, remaining);
      advance.repaidPaise += deduct;
      if (advance.repaidPaise >= advance.amountPaise) advance.fullyRepaid = true;
      await advance.save();
      remaining -= deduct;
    }
  }

  private toRupees(doc: Record<string, unknown>) {
    const fields = ['grossLaborPaise', 'approvedIncentivePaise', 'approvedPenaltyPaise',
      'advanceDeductionPaise', 'authorizedAdjustmentPaise', 'netPayablePaise', 'paidPaise'];
    const result: Record<string, unknown> = { ...doc };
    for (const f of fields) {
      if (f in doc) result[f.replace('Paise', 'Rupees')] = (doc[f] as number) / 100;
    }
    return result;
  }
}
