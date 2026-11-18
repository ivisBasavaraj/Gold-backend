const router = require('express').Router();
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const verificationUploadDir = path.join(__dirname, '../../uploads/ocr');
fs.mkdirSync(verificationUploadDir, { recursive: true });
const verificationEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, verificationUploadDir),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `recipient-scale-${Date.now()}-${uuidv4().slice(0, 8)}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

function toGrams(job) {
  const j = job.toObject ? job.toObject() : { ...job };
  j.requiredWeightGrams = (j.requiredWeightMg ?? 0) / 1000;
  return j;
}

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
    res.json({ data: { items: items.map(toGrams), total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/my-jobs
router.get('/my-jobs', auth, async (req, res) => {
  try {
    const filter = req.user.karagarId ? { karagarId: req.user.karagarId } : {};
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ data: { items: jobs.map(toGrams), total: jobs.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ data: toGrams(job) });
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
      requiredWeightMg: req.body.requiredWeightMg,
      dueDate: req.body.dueDate,
      karagarId: karagar._id,
      karagarName: karagar.name,
      notes: req.body.notes,
    });

    await Karagar.findByIdAndUpdate(karagar._id, { $inc: { activeJobCount: 1 } });
    res.status(201).json({ data: toGrams(job) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /jobs/:id/verify-ocr — karagar scans scale to verify weight matches manager's reading
router.post('/:id/verify-ocr', auth, verificationEvidenceUpload.single('karagarOcrImage'), async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (!req.user.karagarId || String(job.karagarId) !== String(req.user.karagarId)) {
      return res.status(403).json({ message: 'Only the assigned karagar can verify this issuance' });
    }

    const karagarOcrGrams = Number(req.body.karagarOcrGrams);
    if (!Number.isFinite(karagarOcrGrams) || karagarOcrGrams <= 0)
      return res.status(400).json({ message: 'karagarOcrGrams required' });
    if (!req.file) return res.status(400).json({ message: 'Karagar OCR evidence image is required' });

    const verificationEvidence = {
      karagarOcrGrams,
      karagarOcrImageUrl: `/uploads/ocr/${req.file.filename}`,
      karagarOcrCapturedAt: new Date(),
    };

    // If manager did not scan, skip verification and allow start
    if (job.managerOcrGrams == null) {
      await Job.findByIdAndUpdate(job._id, { ...verificationEvidence, ocrVerified: true });
      return res.json({ data: { verified: true, message: 'No manager OCR on record — verification skipped' } });
    }

    const tolerance = job.ocrToleranceGrams ?? 0.5;
    const diff = Math.abs(karagarOcrGrams - job.managerOcrGrams);
    const verified = diff <= tolerance;

    await Job.findByIdAndUpdate(job._id, { ...verificationEvidence, ocrVerified: verified });

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

    const currentJob = await Job.findById(req.params.id);
    if (!currentJob) return res.status(404).json({ message: 'Job not found' });
    if (update.status === 'inProgress' && currentJob.managerOcrGrams != null && !currentJob.ocrVerified) {
      return res.status(409).json({ message: 'Karagar scale verification is required before starting this job' });
    }
    const job = await Job.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Decrement activeJobCount when job is completed or cancelled
    if (update.status === 'completed' || update.status === 'cancelled') {
      await Karagar.findByIdAndUpdate(job.karagarId, { $inc: { activeJobCount: -1 } });
    }

    res.json({ data: toGrams(job) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Compatibility endpoint used by the Flutter job screen.
router.post('/:id/status', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (req.body.status === 'inProgress' && job.managerOcrGrams != null && !job.ocrVerified) {
      return res.status(409).json({ message: 'Karagar scale verification is required before starting this job' });
    }
    job.status = req.body.status;
    await job.save();
    res.json({ data: toGrams(job) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
