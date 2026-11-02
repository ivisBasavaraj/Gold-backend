const router = require('express').Router();
const Job = require('../models/Job');
const Karagar = require('../models/Karagar');
const Advance = require('../models/Advance');
const Payroll = require('../models/Payroll');
const MaterialIssuance = require('../models/MaterialIssuance');
const MaterialReceipt = require('../models/MaterialReceipt');
const { auth } = require('../middleware/auth');

// GET /reports/dashboard
router.get('/dashboard', auth, async (req, res) => {
  try {
    const [jobs, activeKaragars, advances, payrolls, issuances, receipts] = await Promise.all([
      Job.find(),
      Karagar.countDocuments({ isActive: true }),
      Advance.find(),
      Payroll.find(),
      MaterialIssuance.find({ reversed: { $ne: true } }),
      MaterialReceipt.find({ reversed: { $ne: true } }),
    ]);

    // Jobs by status
    const byStatus = jobs.reduce((acc, j) => {
      acc[j.status] = (acc[j.status] || 0) + 1;
      return acc;
    }, {});

    // Gold — use MaterialIssuance/Receipt for accurate totals
    const totalIssuedGrams   = issuances.reduce((s, i) => s + (i.physicalWeightGrams || 0), 0);
    const totalReturnedGrams = receipts.reduce((s, r)  => s + (r.physicalWeightGrams || 0), 0);

    // Advances — total disbursed vs outstanding
    const totalAdvancePaidRupees = advances.reduce((s, a) => s + (a.amountRupees || 0), 0);
    const totalAdvanceOutstandingRupees = advances.reduce(
      (s, a) => s + ((a.amountRupees || 0) - (a.repaidRupees || 0)), 0
    );

    // Payroll — total paid salary
    const totalSalaryPaidRupees = payrolls.reduce((s, p) => s + (p.paidRupees || 0), 0);
    const totalSalaryNetRupees  = payrolls.reduce((s, p) => s + (p.netPayableRupees || 0), 0);
    const pendingPayrollCount   = payrolls.filter(p =>
      ['draft', 'underReview', 'approved', 'partiallyPaid'].includes(p.status)
    ).length;

    res.json({
      data: {
        activeKaragars,
        pendingPayrolls: pendingPayrollCount,
        jobs: { total: jobs.length, byStatus },
        gold: {
          totalIssuedGrams,
          totalReturnedGrams,
          inCirculationGrams: totalIssuedGrams - totalReturnedGrams,
        },
        advances: {
          totalOutstandingRupees: totalAdvanceOutstandingRupees,
          totalPaidRupees: totalAdvancePaidRupees,
        },
        payroll: {
          totalPaidRupees: totalSalaryPaidRupees,
          totalNetPayableRupees: totalSalaryNetRupees,
          pendingCount: pendingPayrollCount,
        },
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
