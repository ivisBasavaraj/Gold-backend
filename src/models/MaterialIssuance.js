const mongoose = require('mongoose');

const issuanceSchema = new mongoose.Schema({
  transactionId: { type: String, required: true, unique: true },
  jobId: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  physicalWeightGrams: { type: Number, required: true },
  pureGoldEquivalentGrams: { type: Number, required: true },
  purity: { type: Number, required: true },
  meltingGroup: { type: String, required: true },
  reversed: { type: Boolean, default: false },
  notes: String,
  // OCR fields
  managerOcrGrams: { type: Number },          // reading from manager's scale scan
  ocrConfidence: { type: Number },            // YOLO confidence score
  ocrImageUrl: { type: String },              // optional stored image URL
}, { timestamps: true });

module.exports = mongoose.model('MaterialIssuance', issuanceSchema);
