const router = require('express').Router();
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const Advance = require('../models/Advance');
const Payroll = require('../models/Payroll');
const { auth } = require('../middleware/auth');

// GET /reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [jobs, karagars, advances, payrolls] = await Promise.all([
      Job.find(),
      Karagar.countDocuments({ isActive: true }),
      Advance.find({ fullyRepaid: false }),
      Payroll.countDocuments({ status: { $in: ['draft', 'underReview', 'approved'] } }),
    ]);

    const byStatus = jobs.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {});

    const totalIssuedGrams = jobs.reduce((s, j) => s + j.issuedWeightGrams, 0);
    const totalReturnedGrams = jobs.reduce((s, j) => s + j.returnedWeightGrams, 0);
    const totalOutstanding = advances.reduce(
      (s, a) => s + (a.amountRupees - a.repaidRupees),
      0
    );

    res.json({
      data: {
        activeKaragars: karagars,
        pendingPayrolls: payrolls,
        jobs: { total: jobs.length, byStatus },
        gold: {
          totalIssuedGrams,
          totalReturnedGrams,
          inCirculationGrams: totalIssuedGrams - totalReturnedGrams,
        },
        advances: { totalOutstandingRupees: totalOutstanding },
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /reports/melting-groups
router.get('/melting-groups', auth, async (req, res) => {
  try {
    const groups = await Job.aggregate([
      {
        $group: {
          _id: '$meltingGroup',
          totalJobs: { $sum: 1 },
          activeJobs: {
            $sum: {
              $cond: [{ $in: ['$status', ['assigned', 'inProgress', 'qualityCheck']] }, 1, 0],
            },
          },
          completedJobs: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] },
          },
          totalIssuedGrams: { $sum: '$issuedWeightGrams' },
          totalReturnedGrams: { $sum: '$returnedWeightGrams' },
        },
      },
      { $sort: { _id: 1 } },
    ]);
    res.json({ data: groups });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
