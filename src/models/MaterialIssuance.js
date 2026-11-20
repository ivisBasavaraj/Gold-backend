const mongoose = require('mongoose');

const issuanceSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  physicalWeightGrams: { type: Number, required: true },
  reversed: { type: Boolean, default: false },
  notes: String,
  managerOcrGrams: { type: Number },
  ocrConfidence: { type: Number },
  ocrImageUrl: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('MaterialIssuance', issuanceSchema);
