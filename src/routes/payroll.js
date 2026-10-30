const router = require('express').Router();
const Payroll = require('../models/Payroll');
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');

// GET /payroll/my — karagar sees only their own payroll records
router.get('/my', auth, async (req, res) => {
  try {
    if (!req.user.karagarId) {
      return res.status(403).json({ message: 'No karagar profile linked to this account' });
    }
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const filter = { karagarId: req.user.karagarId };
    if (req.query.status) filter.status = req.query.status;
    const [items, total] = await Promise.all([
      Payroll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payroll.countDocuments(filter),
    ]);
    res.json({ data: { items, total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /payroll
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.karagarId) filter.karagarId = req.query.karagarId;
    if (req.query.status) filter.status = req.query.status;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Payroll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Payroll.countDocuments(filter),
    ]);
    res.json({ data: { items, total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /payroll/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ data: payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /payroll/generate
router.post('/generate', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { karagarId, periodStart, periodEnd } = req.body;
    if (!karagarId || !periodStart || !periodEnd)
      return res.status(400).json({ message: 'karagarId, periodStart, periodEnd required' });

    const karagar = await Karagar.findById(karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    // Find completed jobs for this karagar whose dueDate falls in the period
    const jobs = await Job.find({
      karagarId,
      status: 'completed',
      dueDate: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
    });

    const grossLabor = jobs.reduce((sum, j) => sum + j.pieceCount * j.laborRatePerPiece, 0);
    const allowedWastage = jobs.reduce((sum, j) => sum + j.wastageAllowanceGrams, 0);
    const actualWastage = jobs.reduce(
      (sum, j) => sum + Math.max(0, j.issuedWeightGrams - j.returnedWeightGrams),
      0
    );

    const payroll = await Payroll.create({
      karagarId: karagar._id,
      karagarName: karagar.name,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      jobsDone: jobs.length,
      grossLaborRupees: grossLabor,
      netPayableRupees: grossLabor,
      actualWastageGrams: actualWastage,
      allowedWastageGrams: allowedWastage,
      wastageStatus: actualWastage <= allowedWastage ? 'ok' : 'excess',
    });

    res.status(201).json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payroll/:id/approve
router.post('/:id/approve', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (payroll.status === 'paid') return res.status(400).json({ message: 'Already paid' });

    const incentive = Number(req.body.approvedIncentiveRupees) || 0;
    const penalty = Number(req.body.approvedPenaltyRupees) || 0;

    payroll.approvedIncentiveRupees = incentive;
    payroll.approvedPenaltyRupees = penalty;
    payroll.netPayableRupees = payroll.grossLaborRupees + incentive - penalty - payroll.advanceDeductionRupees;
    payroll.status = 'approved';
    if (req.body.notes) payroll.notes = req.body.notes;
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /payroll/:id/payment
router.post('/:id/payment', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (payroll.status === 'paid') return res.status(400).json({ message: 'Already fully paid' });
    if (!['approved', 'partiallyPaid'].includes(payroll.status))
      return res.status(400).json({ message: 'Payroll must be approved before payment' });

    const amount = Number(req.body.amountRupees) || 0;
    if (amount <= 0) return res.status(400).json({ message: 'Amount must be positive' });

    payroll.paidRupees = Math.min(payroll.paidRupees + amount, payroll.netPayableRupees);
    payroll.status = payroll.paidRupees >= payroll.netPayableRupees ? 'paid' : 'partiallyPaid';
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
