import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Job, JobDocument, JobStatus } from '../jobs/job.schema';
import { Karagar, KaragarDocument } from '../karagars/karagar.schema';
import { MaterialIssuance, MaterialIssuanceDocument } from '../material-issuance/material-issuance.schema';
import { MaterialReceipt, MaterialReceiptDocument } from '../material-receipts/material-receipt.schema';
import { Advance, AdvanceDocument } from '../advances/advance.schema';
import { Payroll, PayrollDocument, PayrollStatus } from '../payroll/payroll.schema';

@Injectable()
export class ReportsService {
  constructor(
    @InjectModel(Job.name) private jobModel: Model<JobDocument>,
    @InjectModel(Karagar.name) private karagarModel: Model<KaragarDocument>,
    @InjectModel(MaterialIssuance.name) private issuanceModel: Model<MaterialIssuanceDocument>,
    @InjectModel(MaterialReceipt.name) private receiptModel: Model<MaterialReceiptDocument>,
    @InjectModel(Advance.name) private advanceModel: Model<AdvanceDocument>,
    @InjectModel(Payroll.name) private payrollModel: Model<PayrollDocument>,
  ) {}

  async getDashboardSummary() {
    const [jobStats, karagarCount, issuanceAgg, receiptAgg, advanceAgg, pendingPayrolls] = await Promise.all([
      this.jobModel.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      this.karagarModel.countDocuments({ isActive: true }),
      this.issuanceModel.aggregate([
        { $match: { reversed: false } },
        { $group: { _id: null, totalMg: { $sum: '$physicalWeightMg' } } },
      ]),
      this.receiptModel.aggregate([
        { $match: { reversed: false } },
        { $group: { _id: null, totalMg: { $sum: '$physicalWeightMg' } } },
      ]),
      this.advanceModel.aggregate([
        { $match: { fullyRepaid: false } },
        { $group: { _id: null, totalPaise: { $sum: { $subtract: ['$amountPaise', '$repaidPaise'] } } } },
      ]),
      this.payrollModel.countDocuments({ status: { $in: [PayrollStatus.APPROVED, PayrollStatus.PARTIALLY_PAID] } }),
    ]);

    const jobStatusMap: Record<string, number> = {};
    for (const s of jobStats) jobStatusMap[s._id] = s.count;

    return {
      jobs: {
        total: Object.values(jobStatusMap).reduce((a, b) => a + b, 0),
        byStatus: jobStatusMap,
      },
      activeKaragars: karagarCount,
      gold: {
        totalIssuedGrams: (issuanceAgg[0]?.totalMg ?? 0) / 1000,
        totalReturnedGrams: (receiptAgg[0]?.totalMg ?? 0) / 1000,
        inCirculationGrams: ((issuanceAgg[0]?.totalMg ?? 0) - (receiptAgg[0]?.totalMg ?? 0)) / 1000,
      },
      advances: {
        totalOutstandingRupees: (advanceAgg[0]?.totalPaise ?? 0) / 100,
      },
      pendingPayrolls,
    };
  }

  async getKaragarReport(karagarId: string) {
    const kId = new Types.ObjectId(karagarId);

    const [jobs, issuanceAgg, receiptAgg, advances, payrolls] = await Promise.all([
      this.jobModel.find({ karagarId: kId }).sort({ createdAt: -1 }).lean(),
      this.issuanceModel.aggregate([
        { $match: { karagarId: kId, reversed: false } },
        { $group: { _id: null, totalMg: { $sum: '$physicalWeightMg' } } },
      ]),
      this.receiptModel.aggregate([
        { $match: { karagarId: kId, reversed: false } },
        { $group: { _id: null, totalMg: { $sum: '$physicalWeightMg' } } },
      ]),
      this.advanceModel.find({ karagarId: kId }).sort({ createdAt: -1 }).lean(),
      this.payrollModel.find({ karagarId: kId }).sort({ createdAt: -1 }).lean(),
    ]);

    const totalIssuedMg = issuanceAgg[0]?.totalMg ?? 0;
    const totalReturnedMg = receiptAgg[0]?.totalMg ?? 0;
    const outstandingAdvancePaise = advances
      .filter(a => !a.fullyRepaid)
      .reduce((sum, a) => sum + (a.amountPaise - a.repaidPaise), 0);

    return {
      jobs: jobs.map(j => ({ ...j, requiredWeightGrams: j.requiredWeightMg / 1000 })),
      gold: {
        totalIssuedGrams: totalIssuedMg / 1000,
        totalReturnedGrams: totalReturnedMg / 1000,
        outstandingCustodyGrams: (totalIssuedMg - totalReturnedMg) / 1000,
      },
      advances: advances.map(a => ({
        ...a,
        amountRupees: a.amountPaise / 100,
        repaidRupees: a.repaidPaise / 100,
        outstandingRupees: (a.amountPaise - a.repaidPaise) / 100,
      })),
      outstandingAdvanceRupees: outstandingAdvancePaise / 100,
      payrolls: payrolls.map(p => ({ ...p, netPayableRupees: p.netPayablePaise / 100, paidRupees: p.paidPaise / 100 })),
    };
  }

  async getMeltingGroupReport() {
    return this.jobModel.aggregate([
      {
        $group: {
          _id: '$meltingGroup',
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: { $cond: [{ $in: ['$status', [JobStatus.ASSIGNED, JobStatus.IN_PROGRESS, JobStatus.QUALITY_CHECK]] }, 1, 0] },
          },
          completedJobs: { $sum: { $cond: [{ $eq: ['$status', JobStatus.COMPLETED] }, 1, 0] } },
          totalIssuedMg: { $sum: '$totalIssuedMg' },
          totalReturnedMg: { $sum: '$totalReturnedMg' },
        },
      },
      {
        $addFields: {
          totalIssuedGrams: { $divide: ['$totalIssuedMg', 1000] },
          inCirculationGrams: { $divide: [{ $subtract: ['$totalIssuedMg', '$totalReturnedMg'] }, 1000] },
        },
      },
      { $sort: { _id: 1 } },
    ]);
  }
}
