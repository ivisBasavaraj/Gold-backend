const router = require('express').Router();
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { auth } = require('../middleware/auth');

// GET /jobs
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    const jobs = await Job.find(filter).sort({ createdAt: -1 });
    res.json({ data: { items: jobs, total: jobs.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /jobs/my-jobs
router.get('/my-jobs', auth, async (req, res) => {
  try {
    const user = req.user;
    const filter = user.karagarId ? { karagarId: user.karagarId } : {};
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
router.post('/', auth, async (req, res) => {
  try {
    const karagar = await Karagar.findById(req.body.karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    const count = await Job.countDocuments();
    const jobNumber = String(1000 + count + 1);

    const weightGrams = req.body.requiredWeightMg
      ? req.body.requiredWeightMg / 1000
      : req.body.requiredWeightGrams;
    const laborRate = req.body.laborRatePerPiecePaise
      ? req.body.laborRatePerPiecePaise / 100
      : req.body.laborRatePerPiece;
    const wastage = req.body.wastageAllowanceMg
      ? req.body.wastageAllowanceMg / 1000
      : req.body.wastageAllowanceGrams;

    const job = await Job.create({
      jobNumber,
      title: req.body.title,
      jewelryCategory: req.body.jewelryCategory,
      pieceCount: req.body.pieceCount,
      requiredWeightGrams: weightGrams,
      purity: req.body.purity,
      meltingGroup: req.body.meltingGroup,
      laborRatePerPiece: laborRate,
      wastageAllowanceGrams: wastage,
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

// PATCH /jobs/:id
router.patch('/:id', auth, async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ data: job });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
