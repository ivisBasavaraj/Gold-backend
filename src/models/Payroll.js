const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  karagarId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },

  periodStart: { type: Date, required: true },
  periodEnd:   { type: Date, required: true },

  // Status flow: draft → underReview → approved → partiallyPaid → paid
  status: {
    type: String,
    enum: ['draft', 'underReview', 'approved', 'partiallyPaid', 'paid'],
    default: 'draft',
  },

  // Computed at generate time
  jobsDone:           { type: Number, default: 0 },
  grossLaborRupees:   { type: Number, default: 0 },

  // Set at approve time
  approvedIncentiveRupees: { type: Number, default: 0 },
  approvedPenaltyRupees:   { type: Number, default: 0 },
  advanceDeductionRupees:  { type: Number, default: 0 },
  netPayableRupees:        { type: Number, default: 0 },

  // Updated as payments are recorded
  paidRupees: { type: Number, default: 0 },

  // Wastage tracking
  actualWastageGrams:  { type: Number, default: 0 },
  allowedWastageGrams: { type: Number, default: 0 },
  wastageStatus: {
    type: String,
    enum: ['withinAllowance', 'excess'],
    default: 'withinAllowance',
  },

  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
