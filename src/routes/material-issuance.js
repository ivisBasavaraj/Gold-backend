const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const MaterialIssuance = require('../models/MaterialIssuance');
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth, requireRole } = require('../middleware/auth');

const ocrUploadDir = path.join(__dirname, '../../uploads/ocr');
fs.mkdirSync(ocrUploadDir, { recursive: true });
const ocrEvidenceUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, ocrUploadDir),
    filename: (_req, file, cb) => {
      const extension = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      cb(null, `scale-${Date.now()}-${uuidv4().slice(0, 8)}${extension}`);
    },
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

// GET /material-issuance/my — karagar sees only their own records (karagarId from token)
router.get('/my', auth, async (req, res) => {
  try {
    if (!req.user.karagarId) {
      return res.status(403).json({ message: 'No karagar profile linked to this account' });
    }
    const filter = { karagarId: req.user.karagarId };
    if (req.query.jobId) filter.jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 100;
    const items = await MaterialIssuance.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /material-issuance
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.jobId) filter.jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 20;
    const items = await MaterialIssuance.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /material-issuance
router.post('/', auth, requireRole('admin', 'manager'), ocrEvidenceUpload.single('ocrImage'), async (req, res) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    // Issuance weight is exclusively the OCR reading. Never accept a client
    // supplied physical weight, because it could differ from the scale proof.
    const physicalGrams = Number(req.body.managerOcrGrams);
    if (!Number.isFinite(physicalGrams) || physicalGrams <= 0) {
      return res.status(400).json({ message: 'A valid manager OCR scale reading is required' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'OCR evidence image is required' });
    }

    const evidencePath = req.file ? `/uploads/ocr/${req.file.filename}` : null;
    const issuance = await MaterialIssuance.create({
      transactionId: `ISS-${uuidv4().slice(0, 8).toUpperCase()}`,
      jobId: job._id,
      karagarId: job.karagarId,
      karagarName: job.karagarName,
      physicalWeightGrams: physicalGrams,
      notes: req.body.notes,
      managerOcrGrams: physicalGrams,
      ocrConfidence: req.body.ocrConfidence ?? null,
      ocrImageUrl: evidencePath,
      ocrCapturedAt: new Date(),
    });

    // Store manager OCR reading on the job for karagar verification
    const jobUpdate = {
      $inc: { issuedWeightGrams: physicalGrams },
      // Every new issuance needs a fresh recipient verification before work
      // can start or resume.
      status: 'assigned',
      managerOcrGrams: physicalGrams,
      ocrVerified: false,
    };
    await Job.findByIdAndUpdate(job._id, jobUpdate);

    // Update karagar totals
    await Karagar.findByIdAndUpdate(job.karagarId, {
      $inc: { totalIssuedGrams: physicalGrams },
    });

    // Update treasury
    const treasury = await Treasury.findOne();
    if (treasury) {
      const newAvailable = treasury.availableGoldGrams - physicalGrams;
      const newIssued = treasury.issuedGoldGrams + physicalGrams;
      await Treasury.findByIdAndUpdate(treasury._id, {
        availableGoldGrams: newAvailable,
        issuedGoldGrams: newIssued,
      });
      await TreasuryTx.create({
        type: 'issuance',
        description: `Gold issued for Job #${job.jobNumber} to ${job.karagarName}`,
        amountMg: -(physicalGrams * 1000),
        balanceAfterMg: newAvailable * 1000,
      });
    }

    res.status(201).json({ data: issuance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
