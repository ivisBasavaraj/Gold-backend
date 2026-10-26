const router = require('express').Router();
const Payroll = require('../models/Payroll');
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { auth } = require('../middleware/auth');

// GET /payroll
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.karagarId) filter.karagarId = req.query.karagarId;
    const limit = parseInt(req.query.limit) || 20;
    const items = await Payroll.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
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
router.post('/generate', auth, async (req, res) => {
  try {
    const { karagarId, periodStart, periodEnd } = req.body;
    const karagar = await Karagar.findById(karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    const jobs = await Job.find({
      karagarId,
      status: 'completed',
      createdAt: { $gte: new Date(periodStart), $lte: new Date(periodEnd) },
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
router.post('/:id/approve', auth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

    const incentive = req.body.approvedIncentivePaise
      ? req.body.approvedIncentivePaise / 100
      : req.body.approvedIncentiveRupees || 0;
    const penalty = req.body.approvedPenaltyPaise
      ? req.body.approvedPenaltyPaise / 100
      : req.body.approvedPenaltyRupees || 0;

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
router.post('/:id/payment', auth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

    const amount = req.body.amountPaise
      ? req.body.amountPaise / 100
      : req.body.amountRupees;

    payroll.paidRupees = Math.min(payroll.paidRupees + amount, payroll.netPayableRupees);
    payroll.status =
      payroll.paidRupees >= payroll.netPayableRupees ? 'paid' : 'partiallyPaid';
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
