const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  jobsDone: { type: Number, default: 0 },
  grossLaborRupees: { type: Number, default: 0 },
  approvedIncentiveRupees: { type: Number, default: 0 },
  approvedPenaltyRupees: { type: Number, default: 0 },
  advanceDeductionRupees: { type: Number, default: 0 },
  netPayableRupees: { type: Number, default: 0 },
  paidRupees: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'underReview', 'approved', 'partiallyPaid', 'paid'],
    default: 'draft',
  },
  wastageStatus: { type: String, enum: ['ok', 'excess', 'pending'], default: 'pending' },
  actualWastageGrams: { type: Number, default: 0 },
  allowedWastageGrams: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
