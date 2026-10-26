const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const Advance = require('../models/Advance');
const Karagar = require('../models/Karagar');
const { auth } = require('../middleware/auth');

// GET /advances
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.karagarId) filter.karagarId = req.query.karagarId;
    const limit = parseInt(req.query.limit) || 20;
    const items = await Advance.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /advances/karagar/:karagarId/balance
router.get('/karagar/:karagarId/balance', auth, async (req, res) => {
  try {
    const advances = await Advance.find({
      karagarId: req.params.karagarId,
      fullyRepaid: false,
    });
    const totalOutstanding = advances.reduce(
      (sum, a) => sum + (a.amountRupees - a.repaidRupees),
      0
    );
    res.json({ data: { totalOutstandingRupees: totalOutstanding, advances } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /advances/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: 'Advance not found' });
    res.json({ data: advance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /advances
router.post('/', auth, async (req, res) => {
  try {
    const karagar = await Karagar.findById(req.body.karagarId);
    if (!karagar) return res.status(404).json({ message: 'Karagar not found' });

    const amountRupees = req.body.amountPaise
      ? req.body.amountPaise / 100
      : req.body.amountRupees;

    const advance = await Advance.create({
      transactionId: `ADV-${uuidv4().slice(0, 8).toUpperCase()}`,
      karagarId: karagar._id,
      karagarName: karagar.name,
      amountRupees,
      paymentMode: req.body.paymentMode || 'cash',
      purpose: req.body.purpose,
      referenceNumber: req.body.referenceNumber,
    });

    res.status(201).json({ data: advance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /advances/:id/repay
router.post('/:id/repay', auth, async (req, res) => {
  try {
    const advance = await Advance.findById(req.params.id);
    if (!advance) return res.status(404).json({ message: 'Advance not found' });

    const amount = req.body.amountPaise
      ? req.body.amountPaise / 100
      : req.body.amountRupees;

    advance.repaidRupees = Math.min(advance.repaidRupees + amount, advance.amountRupees);
    advance.fullyRepaid = advance.repaidRupees >= advance.amountRupees;
    await advance.save();

    res.json({ data: advance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
