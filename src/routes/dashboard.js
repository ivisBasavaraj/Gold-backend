const router = require('express').Router();
const Karagar = require('../models/Karagar');
const Job = require('../models/Job');
const Advance = require('../models/Advance');
const Payroll = require('../models/Payroll');
const { Treasury } = require('../models/Treasury');
const { auth } = require('../middleware/auth');

// GET /dashboard/summary
router.get('/summary', auth, async (req, res) => {
  try {
    const [totalKaragars, jobs, advances, payrolls, treasury] = await Promise.all([
      Karagar.countDocuments({ isActive: true }),
      Job.find().select('issuedWeightGrams status'),
      Advance.find().select('amountRupees'),
      Payroll.find().select('netPayableRupees'),
      Treasury.findOne(),
    ]);

    const totalGoldIssuedGrams = jobs.reduce((s, j) => s + j.issuedWeightGrams, 0);
    const totalAdvancePaidRupees = advances.reduce((s, a) => s + a.amountRupees, 0);
    const totalSalaryRupees = payrolls.reduce((s, p) => s + p.netPayableRupees, 0);

    const t = treasury || {
      openingReserveGrams: 1000,
      availableGoldGrams: 650,
      issuedGoldGrams: 420,
      returnedGoldGrams: 70,
    };
    const inCirculationGrams = t.issuedGoldGrams - t.returnedGoldGrams;
    const reserveRemainingPercent =
      t.openingReserveGrams > 0
        ? (t.availableGoldGrams / t.openingReserveGrams) * 100
        : 0;

    res.json({
      data: {
        totalKaragars,
        totalGoldIssuedGrams,
        totalAdvancePaidRupees,
        totalSalaryRupees,
        treasury: {
          openingReserveGrams: t.openingReserveGrams,
          availableGoldGrams: t.availableGoldGrams,
          issuedGoldGrams: t.issuedGoldGrams,
          returnedGoldGrams: t.returnedGoldGrams,
          inCirculationGrams,
          reserveRemainingPercent,
        },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
