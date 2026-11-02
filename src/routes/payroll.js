const router = require('express').Router();
const mongoose = require('mongoose');
const Payroll = require('../models/Payroll');
const Karagar = require('../models/Karagar');
const Job = require('../models/Job');
const MaterialIssuance = require('../models/MaterialIssuance');
const MaterialReceipt = require('../models/MaterialReceipt');
const Advance = require('../models/Advance');
const { auth, requireRole } = require('../middleware/auth');

// ── helpers ───────────────────────────────────────────────────────────────────

/** Recalculate netPayableRupees and update status based on paidRupees */
function recalcNet(payroll) {
  payroll.netPayableRupees =
    payroll.grossLaborRupees +
    payroll.approvedIncentiveRupees -
    payroll.approvedPenaltyRupees -
    payroll.advanceDeductionRupees;

  if (payroll.paidRupees <= 0) {
    payroll.status = 'approved';
  } else if (payroll.paidRupees >= payroll.netPayableRupees) {
    payroll.status = 'paid';
  } else {
    payroll.status = 'partiallyPaid';
  }
}

// ── POST /payroll/generate — must be registered before /:id routes ───────────
// Body: { karagarId, periodStart, periodEnd }
router.post('/generate', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { karagarId, periodStart, periodEnd } = req.body;
    if (!karagarId || !periodStart || !periodEnd)
      return res.status(400).json({ message: 'karagarId, periodStart, periodEnd are required' });

    const karagar = await Karagar.findById(karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    const start = new Date(periodStart);
    const end   = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    const kId = new mongoose.Types.ObjectId(karagarId);

    const completedJobs = await Job.find({
      karagarId: kId,
      status: 'completed',
      updatedAt: { $gte: start, $lte: end },
    });
    const jobsDone = completedJobs.length;

    const [issuances, receipts] = await Promise.all([
      MaterialIssuance.find({ karagarId: kId, reversed: { $ne: true }, createdAt: { $gte: start, $lte: end } }),
      MaterialReceipt.find({  karagarId: kId, reversed: { $ne: true }, createdAt: { $gte: start, $lte: end } }),
    ]);

    const totalIssuedGrams   = issuances.reduce((s, i) => s + (i.pureGoldEquivalentGrams || 0), 0);
    const totalReturnedGrams = receipts.reduce((s, r)  => s + (r.pureGoldEquivalentGrams || 0), 0);
    const actualWastageGrams = Math.max(0, totalIssuedGrams - totalReturnedGrams);
    const allowedWastageGrams = totalIssuedGrams * 0.01;
    const wastageStatus = actualWastageGrams <= allowedWastageGrams ? 'withinAllowance' : 'excess';

    const payroll = await Payroll.create({
      karagarId: karagar._id,
      karagarName: karagar.name,
      periodStart: start,
      periodEnd:   end,
      status:      'draft',
      jobsDone,
      grossLaborRupees:        0,
      approvedIncentiveRupees: 0,
      approvedPenaltyRupees:   0,
      advanceDeductionRupees:  0,
      netPayableRupees:        0,
      paidRupees:              0,
      actualWastageGrams,
      allowedWastageGrams,
      wastageStatus,
    });

    res.status(201).json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── GET /payroll/my  (karagar — own records) ──────────────────────────────────
router.get('/my', auth, async (req, res) => {
  try {
    if (!req.user.karagarId)
      return res.status(403).json({ message: 'No karagar profile linked to this account' });
    const items = await Payroll.find({ karagarId: req.user.karagarId }).sort({ createdAt: -1 });
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /payroll  (manager/admin — all records, optional ?karagarId=) ─────────
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.karagarId) filter.karagarId = req.query.karagarId;
    const items = await Payroll.find(filter).sort({ createdAt: -1 });
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET /payroll/:id ──────────────────────────────────────────────────────────
router.get('/:id', auth, async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    res.json({ data: payroll });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST /payroll/:id/approve ─────────────────────────────────────────────────
// Body: { grossLaborRupees?, approvedIncentiveRupees?, approvedPenaltyRupees?, notes? }
// Deducts outstanding advance balance automatically.
router.post('/:id/approve', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (!['draft', 'underReview'].includes(payroll.status))
      return res.status(400).json({ message: `Cannot approve a payroll with status '${payroll.status}'` });

    // Manager can optionally override gross labor & adjustments at approve time
    if (req.body.grossLaborRupees   !== undefined) payroll.grossLaborRupees   = Number(req.body.grossLaborRupees);
    if (req.body.approvedIncentiveRupees !== undefined) payroll.approvedIncentiveRupees = Number(req.body.approvedIncentiveRupees);
    if (req.body.approvedPenaltyRupees   !== undefined) payroll.approvedPenaltyRupees   = Number(req.body.approvedPenaltyRupees);
    if (req.body.notes !== undefined) payroll.notes = req.body.notes;

    // Auto-deduct outstanding advances for this karagar
    const pendingAdvances = await Advance.find({
      karagarId: payroll.karagarId,
      fullyRepaid: false,
    });
    const totalOwed = pendingAdvances.reduce(
      (s, a) => s + (a.amountRupees - a.repaidRupees), 0
    );
    payroll.advanceDeductionRupees = totalOwed;

    recalcNet(payroll);
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── POST /payroll/:id/payment ─────────────────────────────────────────────────
// Body: { amountRupees }
// Records a cash payment against this payroll.
router.post('/:id/payment', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });
    if (!['approved', 'partiallyPaid'].includes(payroll.status))
      return res.status(400).json({ message: `Cannot record payment for a payroll with status '${payroll.status}'` });

    // Accept amountRupees or amountPaise (Flutter sends both)
    let amount = req.body.amountRupees !== undefined
      ? Number(req.body.amountRupees)
      : Number(req.body.amountPaise) / 100;

    if (!amount || amount <= 0)
      return res.status(400).json({ message: 'amountRupees must be a positive number' });

    payroll.paidRupees += amount;

    // Update status
    if (payroll.paidRupees >= payroll.netPayableRupees) {
      payroll.status = 'paid';
      payroll.paidRupees = payroll.netPayableRupees; // cap at net payable
    } else {
      payroll.status = 'partiallyPaid';
    }

    await payroll.save();

    // Mark advances as repaid proportionally
    if (payroll.advanceDeductionRupees > 0) {
      const pendingAdvances = await Advance.find({
        karagarId: payroll.karagarId,
        fullyRepaid: false,
      }).sort({ createdAt: 1 });

      let toSettle = payroll.advanceDeductionRupees;
      for (const adv of pendingAdvances) {
        if (toSettle <= 0) break;
        const outstanding = adv.amountRupees - adv.repaidRupees;
        const settling    = Math.min(outstanding, toSettle);
        adv.repaidRupees += settling;
        adv.fullyRepaid   = adv.repaidRupees >= adv.amountRupees;
        await adv.save();
        toSettle -= settling;
      }
    }

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── PATCH /payroll/:id  (update notes / paidRupees directly — legacy) ─────────
router.patch('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

    if (req.body.paidRupees !== undefined) payroll.paidRupees = Number(req.body.paidRupees);
    if (req.body.notes      !== undefined) payroll.notes      = req.body.notes;
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// ── DELETE /payroll/:id ───────────────────────────────────────────────────────
router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
