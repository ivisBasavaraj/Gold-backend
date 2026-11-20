const mongoose = require('mongoose');

const treasurySchema = new mongoose.Schema({
  openingReserveGrams: { type: Number, default: 0 },
  availableGoldGrams: { type: Number, default: 0 },
  issuedGoldGrams: { type: Number, default: 0 },
  returnedGoldGrams: { type: Number, default: 0 },
}, { timestamps: true });

const treasuryTxSchema = new mongoose.Schema({
  type: { type: String, required: true },
  description: String,
  note: String,
  amountMg: { type: Number, required: true },
  balanceAfterMg: { type: Number, required: true },
  refId: String,
  performedBy: String, // name of the admin/manager who made the change
}, { timestamps: true });

treasuryTxSchema.virtual('weightGrams').get(function () {
  return Math.abs(this.amountMg) / 1000;
});
treasuryTxSchema.set('toJSON', { virtuals: true });
treasuryTxSchema.set('toObject', { virtuals: true });

module.exports = {
  Treasury: mongoose.model('Treasury', treasurySchema),
  TreasuryTx: mongoose.model('TreasuryTx', treasuryTxSchema),
};
