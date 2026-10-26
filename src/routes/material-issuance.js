const router = require('express').Router();
const { v4: uuidv4 } = require('uuid');
const MaterialIssuance = require('../models/MaterialIssuance');
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const { Treasury, TreasuryTx } = require('../models/Treasury');
const { auth } = require('../middleware/auth');

// GET /material-issuance
router.get('/', auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.jobId) filter.jobId = req.query.jobId;
    const limit = parseInt(req.query.limit) || 20;
    const items = await MaterialIssuance.find(filter).sort({ createdAt: -1 }).limit(limit);
    res.json({ data: { items, total: items.length } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /material-issuance
router.post('/', auth, async (req, res) => {
  try {
    const job = await Job.findById(req.body.jobId);
    if (!job) return res.status(404).json({ message: 'Job not found' });

    const physicalGrams = req.body.physicalWeightMg
      ? req.body.physicalWeightMg / 1000
      : req.body.physicalWeightGrams;
    const purity = req.body.purity || job.purity;
    const pureGrams = physicalGrams * purity;

    const issuance = await MaterialIssuance.create({
      transactionId: `ISS-${uuidv4().slice(0, 8).toUpperCase()}`,
      jobId: job._id,
      karagarId: job.karagarId,
      karagarName: job.karagarName,
      physicalWeightGrams: physicalGrams,
      pureGoldEquivalentGrams: pureGrams,
      purity,
      meltingGroup: job.meltingGroup,
      notes: req.body.notes,
    });

    // Update job issued weight
    await Job.findByIdAndUpdate(job._id, {
      $inc: { issuedWeightGrams: physicalGrams },
      status: 'inProgress',
    });

    // Update karagar totals
    await Karagar.findByIdAndUpdate(job.karagarId, {
      $inc: { totalIssuedGrams: physicalGrams },
    });

    // Update treasury
    const treasury = await Treasury.findOne();
    if (treasury) {
      const newAvailable = treasury.availableGoldGrams - physicalGrams;
      const newIssued = treasury.issuedGoldGrams + physicalGrams;
      await Treasury.findByIdAndUpdate(treasury._id, {
        availableGoldGrams: newAvailable,
        issuedGoldGrams: newIssued,
      });
      await TreasuryTx.create({
        type: 'issuance',
        description: `Gold issued for Job #${job.jobNumber} to ${job.karagarName}`,
        amountMg: -(physicalGrams * 1000),
        balanceAfterMg: newAvailable * 1000,
      });
    }

    res.status(201).json({ data: issuance });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

module.exports = router;
