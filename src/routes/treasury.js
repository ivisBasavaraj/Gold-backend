const router = require('express').Router();
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth, requireRole } = require('../middleware/auth');

function buildSummary(treasury) {
  const inCirculation = treasury.issuedGoldGrams - treasury.returnedGoldGrams;
  const reserveRemainingPercent =
    treasury.openingReserveGrams > 0
      ? (treasury.availableGoldGrams / treasury.openingReserveGrams) * 100
      : 0;
  return {
    openingReserveGrams: treasury.openingReserveGrams,
    availableGoldGrams: treasury.availableGoldGrams,
    issuedGoldGrams: treasury.issuedGoldGrams,
    returnedGoldGrams: treasury.returnedGoldGrams,
    inCirculationGrams: inCirculation,
    reserveRemainingPercent,
  };
}

async function getOrCreateTreasury() {
  let t = await Treasury.findOne();
  if (!t) {
    t = await Treasury.create({
      openingReserveGrams: 1000,
      availableGoldGrams: 1000,
      issuedGoldGrams: 0,
      returnedGoldGrams: 0,
    });
  }
  return t;
}

// GET /treasury/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const treasury = await getOrCreateTreasury();
    res.json({ data: buildSummary(treasury) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PATCH /treasury/reserve — update opening reserve (admin/manager only)
router.patch('/reserve', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { openingReserveGrams, availableGoldGrams } = req.body;
    if (openingReserveGrams == null) return res.status(400).json({ message: 'openingReserveGrams required' });

    const treasury = await getOrCreateTreasury();
    treasury.openingReserveGrams = openingReserveGrams;
    if (availableGoldGrams != null) treasury.availableGoldGrams = availableGoldGrams;
    await treasury.save();

    await TreasuryTx.create({
      type: 'adjustment',
      description: `Reserve updated to ${openingReserveGrams}g by ${req.user.name}`,
      amountMg: 0,
      balanceAfterMg: treasury.availableGoldGrams * 1000,
    });

    res.json({ data: buildSummary(treasury) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// GET /treasury/transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      TreasuryTx.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      TreasuryTx.countDocuments(),
    ]);

    res.json({ data: { items, total, page, limit } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
