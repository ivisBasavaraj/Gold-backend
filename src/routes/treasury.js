const router = require('express').Router();
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth, requireRole } = require('../middleware/auth');

const MAX_NOTE_LENGTH = 500;

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
// (original behaviour, unchanged: it only sets the opening reserve and,
//  optionally, the available gold)
router.patch('/reserve', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { openingReserveGrams, availableGoldGrams } = req.body;
    if (openingReserveGrams == null) {
      return res.status(400).json({ message: 'openingReserveGrams required' });
    }

    const nextReserveGrams = Number(openingReserveGrams);
    if (!Number.isFinite(nextReserveGrams) || nextReserveGrams < 0) {
      return res.status(400).json({ message: 'openingReserveGrams must be zero or positive' });
    }

    const treasury = await getOrCreateTreasury();
    treasury.openingReserveGrams = nextReserveGrams;

    if (availableGoldGrams != null) {
      const nextAvailableGrams = Number(availableGoldGrams);
      if (!Number.isFinite(nextAvailableGrams) || nextAvailableGrams < 0) {
        return res.status(400).json({ message: 'availableGoldGrams must be zero or positive' });
      }
      treasury.availableGoldGrams = nextAvailableGrams;
    }
    await treasury.save();

    await TreasuryTx.create({
      type: 'adjustment',
      description: `Reserve updated to ${nextReserveGrams}g by ${req.user.name}`,
      amountMg: 0,
      balanceAfterMg: Math.round(treasury.availableGoldGrams * 1000),
    });

    res.json({ data: buildSummary(treasury) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// POST /treasury/adjustment — add or remove gold (admin/manager only)
//
// body: { isAdd: boolean, amountMg: positive integer, note?: string }
//   - isAdd true  -> adds amountMg to the available gold
//   - isAdd false -> removes amountMg (a reason in `note` is required)
// Logs a TreasuryTx and returns the updated summary.
router.post('/adjustment', auth, requireRole('admin', 'manager'), async (req, res) => {
  try {
    const { isAdd, amountMg, note } = req.body;

    if (typeof isAdd !== 'boolean') {
      return res.status(400).json({ message: 'isAdd must be true or false' });
    }
    if (!Number.isInteger(amountMg) || amountMg <= 0) {
      return res.status(400).json({ message: 'amountMg must be a positive integer' });
    }

    const cleanNote = note ? String(note).trim().slice(0, MAX_NOTE_LENGTH) : '';
    if (!isAdd && !cleanNote) {
      return res.status(400).json({ message: 'Reason for removal is required' });
    }

    const treasury = await getOrCreateTreasury();
    const signedAmountMg = isAdd ? amountMg : -amountMg;
    const currentBalanceMg = Math.round(treasury.availableGoldGrams * 1000);
    const nextBalanceMg = currentBalanceMg + signedAmountMg;
    if (nextBalanceMg < 0) {
      return res.status(400).json({ message: 'Cannot remove more than available gold' });
    }

    // Compare-and-swap: only apply the change if the balance is still what we
    // read a moment ago. This stops two simultaneous requests from overwriting
    // each other.
    const updated = await Treasury.findOneAndUpdate(
      { _id: treasury._id, availableGoldGrams: treasury.availableGoldGrams },
      { $set: { availableGoldGrams: nextBalanceMg / 1000 } },
      { new: true }
    );
    if (!updated) {
      return res
        .status(409)
        .json({ message: 'Treasury was changed by someone else. Please try again.' });
    }

    await TreasuryTx.create({
      type: 'adjustment',
      description: `${isAdd ? 'Gold added' : 'Gold removed'} — ${(amountMg / 1000).toFixed(3)} g`,
      note: cleanNote,
      amountMg: signedAmountMg,
      balanceAfterMg: Math.round(updated.availableGoldGrams * 1000),
      performedBy: req.user && req.user.name ? req.user.name : undefined,
    });

    res.status(201).json({ data: buildSummary(updated) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /treasury/transactions
router.get('/transactions', auth, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 100);
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
