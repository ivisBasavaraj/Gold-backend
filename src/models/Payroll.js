const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  paidRupees: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Payroll', payrollSchema);
