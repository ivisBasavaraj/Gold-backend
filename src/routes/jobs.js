const router = require('express').Router();
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');

// GET /jobs
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.karagarId) filter.karagarId = req.query.karagarId;
    if (req.query.meltingGroup) filter.meltingGroup = req.query.meltingGroup;
    if (req.query.search) filter.$or = [
      { title: { $regex: req.query.search, $options: 'i' } },
      { jobNumber: { $regex: req.query.search, $options: 'i' } },
    ];

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Job.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Job.countDocuments(filter),
    ]);
    res.json({ data: { items, total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/my-jobs
router.get('/my-jobs', auth, async (req, res) => {
  try {
    const filter = req.user.karagarId ? { karagarId: req.user.karagarId } : {};
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ data: { items: jobs, total: jobs.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ data: job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /jobs
router.post('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const karagar = await Karagar.findById(req.body.karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });
    if (!karagar.isActive) return res.status(400).json({ message: 'Karagar is inactive' });

    const count = await Job.countDocuments();
    const jobNumber = String(1000 + count + 1);

    const job = await Job.create({
      jobNumber,
      title: req.body.title,
      jewelryCategory: req.body.jewelryCategory,
      pieceCount: req.body.pieceCount,
      requiredWeightGrams: req.body.requiredWeightGrams,
      purity: req.body.purity,
      meltingGroup: req.body.meltingGroup,
      laborRatePerPiece: req.body.laborRatePerPiece,
      wastageAllowanceGrams: req.body.wastageAllowanceGrams,
      dueDate: req.body.dueDate,
      karagarId: karagar._id,
      karagarName: karagar.name,
      notes: req.body.notes,
    });

    await Karagar.findByIdAndUpdate(karagar._id, { $inc: { activeJobCount: 1 } });
    res.status(201).json({ data: job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /jobs/:id/verify-ocr — karagar scans scale to verify weight matches manager's reading
router.post('/:id/verify-ocr', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const karagarOcrGrams = Number(req.body.karagarOcrGrams);
    if (!karagarOcrGrams || karagarOcrGrams <= 0)
      return res.status(400).json({ message: 'karagarOcrGrams required' });

    // If manager did not scan, skip verification and allow start
    if (job.managerOcrGrams == null) {
      await Job.findByIdAndUpdate(job._id, { karagarOcrGrams, ocrVerified: true });
      return res.json({ data: { verified: true, message: 'No manager OCR on record — verification skipped' } });
    }

    const tolerance = job.ocrToleranceGrams ?? 0.5;
    const diff = Math.abs(karagarOcrGrams - job.managerOcrGrams);
    const verified = diff <= tolerance;

    await Job.findByIdAndUpdate(job._id, { karagarOcrGrams, ocrVerified: verified });

    if (!verified) {
      return res.status(409).json({
        message: `Weight mismatch: manager read ${job.managerOcrGrams}g, you read ${karagarOcrGrams}g (diff ${diff.toFixed(3)}g, tolerance ${tolerance}g)`,
        data: { verified: false, managerOcrGrams: job.managerOcrGrams, karagarOcrGrams, diff, tolerance },
      });
    }

    res.json({ data: { verified: true, managerOcrGrams: job.managerOcrGrams, karagarOcrGrams, diff } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /jobs/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const allowed = ['status', 'issuedWeightGrams', 'returnedWeightGrams', 'notes', 'dueDate'];
    const update = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) update[f] = req.body[f]; });

    const job = await Job.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Decrement activeJobCount when job is completed or cancelled
    if (update.status === 'completed' || update.status === 'cancelled') {
      await Karagar.findByIdAndUpdate(job.karagarId, { $inc: { activeJobCount: -1 } });
    }

    res.json({ data: job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
