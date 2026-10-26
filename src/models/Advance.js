const mongoose = require('mongoose');

const advanceSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  amountRupees: { type: Number, required: true },
  repaidRupees: { type: Number, default: 0 },
  fullyRepaid: { type: Boolean, default: false },
  paymentMode: { type: String, enum: ['cash', 'upi', 'bank', 'bankTransfer'], default: 'cash' },
  purpose: String,
  referenceNumber: String,
}, { timestamps: true });

module.exports = mongoose.model('Advance', advanceSchema);
