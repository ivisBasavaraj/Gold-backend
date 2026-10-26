const mongoose = require('mongoose');

const karagarSchema = new mongoose.Schema({
  name: { type: String, required: true },
  employeeCode: { type: String, required: true, unique: true },
  meltingGroup: { type: String, required: true },
  specialization: { type: String, required: true },
  phone: String,
  avatarUrl: String,
  isActive: { type: Boolean, default: true },
  totalIssuedGrams: { type: Number, default: 0 },
  totalReturnedGrams: { type: Number, default: 0 },
  activeJobCount: { type: Number, default: 0 },
  joinedAt: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('Karagar', karagarSchema);
