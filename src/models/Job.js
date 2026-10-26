const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema({
  jobNumber: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  jewelryCategory: { type: String, required: true },
  pieceCount: { type: Number, required: true },
  requiredWeightGrams: { type: Number, required: true },
  purity: { type: Number, required: true },
  meltingGroup: { type: String, required: true },
  laborRatePerPiece: { type: Number, required: true },
  wastageAllowanceGrams: { type: Number, required: true },
  dueDate: { type: Date, required: true },
  status: {
    type: String,
    enum: ['assigned', 'inProgress', 'qualityCheck', 'completed', 'cancelled'],
    default: 'assigned',
  },
  karagarId: { type: mongoose.Schema.Types.ObjectId, ref: 'Karagar', required: true },
  karagarName: { type: String, required: true },
  issuedWeightGrams: { type: Number, default: 0 },
  returnedWeightGrams: { type: Number, default: 0 },
  notes: String,
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);
