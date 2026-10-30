const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const MaterialReceipt = require('../models/MaterialReceipt');
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth } = require('../middleware/auth');

// GET /material-receipts/my — karagar sees only their own records (karagarId from token)
router.get('/my', auth, async (req, res) => {
  try {
    if (!req.user.karagarId) {
      return res.status(403).json({ message: 'No karagar profile linked to this account' });
    }
    const filter = { karagarId: req.user.karagarId };
    if (req.query.jobId) filter.jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 100;
    const items = await MaterialReceipt.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /material-receipts
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.jobId) filter.jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 20;
    const items = await MaterialReceipt.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /material-receipts
router.post('/', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const physicalGrams = req.body.physicalWeightMg
      ? req.body.physicalWeightMg / 1000
      : req.body.physicalWeightGrams;
    const purity = req.body.purity || job.purity;
    const pureGrams = physicalGrams * purity;

    const receipt = await MaterialReceipt.create({
      transactionId: `REC-${uuidv4().slice(0, 8).toUpperCase()}`,
      jobId: job._id,
      karagarId: job.karagarId,
      karagarName: job.karagarName,
      receiptType: req.body.receiptType || 'finished',
      physicalWeightGrams: physicalGrams,
      pureGoldEquivalentGrams: pureGrams,
      purity,
      meltingGroup: job.meltingGroup,
      notes: req.body.notes,
    });

    // Update job returned weight
    const updatedJob = await Job.findByIdAndUpdate(
      job._id,
      { $inc: { returnedWeightGrams: physicalGrams } },
      { new: true }
    );

    // Mark job completed if fully returned
    if (updatedJob.returnedWeightGrams >= updatedJob.issuedWeightGrams) {
      await Job.findByIdAndUpdate(job._id, { status: 'qualityCheck' });
      await Karagar.findByIdAndUpdate(job.karagarId, { $inc: { activeJobCount: -1 } });
    }

    // Update karagar totals
    await Karagar.findByIdAndUpdate(job.karagarId, {
      $inc: { totalReturnedGrams: physicalGrams },
    });

    // Update treasury
    const treasury = await Treasury.findOne();
    if (treasury) {
      const newAvailable = treasury.availableGoldGrams + physicalGrams;
      const newReturned = treasury.returnedGoldGrams + physicalGrams;
      await Treasury.findByIdAndUpdate(treasury._id, {
        availableGoldGrams: newAvailable,
        returnedGoldGrams: newReturned,
      });
      await TreasuryTx.create({
        type: 'receipt',
        description: `Gold received from ${job.karagarName} for Job #${job.jobNumber}`,
        amountMg: physicalGrams * 1000,
        balanceAfterMg: newAvailable * 1000,
      });
    }

    res.status(201).json({ data: receipt });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
