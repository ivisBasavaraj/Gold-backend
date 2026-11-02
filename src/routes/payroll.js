const router = require('express').Router();
const Payroll = require('../models/Payroll');
const Karagar = require('../models/Karagar');
const { auth, requireRole } = require('../middleware/auth');

// GET /payroll/my
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

// GET /payroll
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

// POST /payroll
router.post('/', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { karagarId, periodStart, periodEnd, paidRupees, notes } = req.body;
    if (!karagarId || !periodStart || !periodEnd)
      return res.status(400).json({ message: 'karagarId, periodStart, periodEnd required' });

    const karagar = await Karagar.findById(karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    const payroll = await Payroll.create({
      karagarId: karagar._id,
      karagarName: karagar.name,
      periodStart: new Date(periodStart),
      periodEnd: new Date(periodEnd),
      paidRupees: Number(paidRupees) || 0,
      notes,
    });

    res.status(201).json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// PATCH /payroll/:id
router.patch('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) return res.status(404).json({ message: 'Payroll not found' });

    if (req.body.paidRupees !== undefined) payroll.paidRupees = Number(req.body.paidRupees);
    if (req.body.notes !== undefined) payroll.notes = req.body.notes;
    await payroll.save();

    res.json({ data: payroll });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// DELETE /payroll/:id
router.delete('/:id', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    await Payroll.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
