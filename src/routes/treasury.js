const router = require('express').Router();
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth } = require('../middleware/auth');

// GET /treasury/summary
router.get('/summary', auth, async (req, res) => {
  try {
    let treasury = await Treasury.findOne();
    if (!treasury) {
      treasury = await Treasury.create({
        openingReserveGrams: 1000,
        availableGoldGrams: 650,
        issuedGoldGrams: 420,
        returnedGoldGrams: 70,
      });
    }
    const inCirculation = treasury.issuedGoldGrams - treasury.returnedGoldGrams;
    const reserveRemainingPercent =
      treasury.openingReserveGrams > 0
        ? (treasury.availableGoldGrams / treasury.openingReserveGrams) * 100
        : 0;

    res.json({
      data: {
        openingReserveGrams: treasury.openingReserveGrams,
        availableGoldGrams: treasury.availableGoldGrams,
        issuedGoldGrams: treasury.issuedGoldGrams,
        returnedGoldGrams: treasury.returnedGoldGrams,
        inCirculationGrams: inCirculation,
        reserveRemainingPercent,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
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
