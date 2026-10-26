require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Karagar = require('../models/Karagar');
const Job = require('../models/Job');
const { Treasury, TreasuryTx } = require('../models/Treasury');
const Advance = require('../models/Advance');
const Payroll = require('../models/Payroll');

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear all
  await Promise.all([
    User.deleteMany(),
    Karagar.deleteMany(),
    Job.deleteMany(),
    Treasury.deleteMany(),
    TreasuryTx.deleteMany(),
    Advance.deleteMany(),
    Payroll.deleteMany(),
  ]);
  console.log('Cleared existing data');

  // Karagars
  const karagars = await Karagar.insertMany([
    {
      name: 'Raju Kumar',
      employeeCode: 'GC-001',
      meltingGroup: 'Group A',
      specialization: 'Bangles & Chains',
      phone: '9876543210',
      isActive: true,
      totalIssuedGrams: 420,
      totalReturnedGrams: 380.5,
      activeJobCount: 2,
      joinedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Suresh Patil',
      employeeCode: 'GC-002',
      meltingGroup: 'Group A',
      specialization: 'Rings & Earrings',
      phone: '9876543211',
      isActive: true,
      totalIssuedGrams: 280,
      totalReturnedGrams: 265,
      activeJobCount: 1,
      joinedAt: new Date(Date.now() - 280 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Mahesh Shetty',
      employeeCode: 'GC-003',
      meltingGroup: 'Group B',
      specialization: 'Necklaces',
      phone: '9876543212',
      isActive: true,
      totalIssuedGrams: 560,
      totalReturnedGrams: 540,
      activeJobCount: 3,
      joinedAt: new Date(Date.now() - 500 * 24 * 60 * 60 * 1000),
    },
    {
      name: 'Venkat Rao',
      employeeCode: 'GC-004',
      meltingGroup: 'Group B',
      specialization: 'Bangles',
      isActive: false,
      totalIssuedGrams: 120,
      totalReturnedGrams: 120,
      activeJobCount: 0,
      joinedAt: new Date(Date.now() - 200 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log('Karagars seeded');

  // Users
  const password = await bcrypt.hash('demo1234', 10);
  await User.insertMany([
    { name: 'Admin User', username: 'admin', password, role: 'admin' },
    { name: 'Manager Singh', username: 'manager', password, role: 'manager' },
    {
      name: karagars[0].name,
      username: 'karagar1',
      password,
      role: 'karagar',
      employeeCode: karagars[0].employeeCode,
      karagarId: karagars[0]._id,
    },
    {
      name: karagars[1].name,
      username: 'karagar2',
      password,
      role: 'karagar',
      employeeCode: karagars[1].employeeCode,
      karagarId: karagars[1]._id,
    },
  ]);
  console.log('Users seeded');

  // Jobs
  const now = new Date();
  const jobs = await Job.insertMany([
    {
      jobNumber: '1042',
      title: 'Bangle Work',
      jewelryCategory: 'Bangles',
      pieceCount: 8,
      requiredWeightGrams: 120,
      purity: 0.916,
      meltingGroup: 'Group A',
      laborRatePerPiece: 250,
      wastageAllowanceGrams: 2,
      dueDate: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000),
      status: 'inProgress',
      karagarId: karagars[0]._id,
      karagarName: karagars[0].name,
      issuedWeightGrams: 120,
      returnedWeightGrams: 0,
    },
    {
      jobNumber: '1043',
      title: 'Necklace Chain',
      jewelryCategory: 'Necklaces',
      pieceCount: 3,
      requiredWeightGrams: 85.5,
      purity: 0.916,
      meltingGroup: 'Group B',
      laborRatePerPiece: 400,
      wastageAllowanceGrams: 1.5,
      dueDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
      status: 'assigned',
      karagarId: karagars[0]._id,
      karagarName: karagars[0].name,
      issuedWeightGrams: 0,
      returnedWeightGrams: 0,
    },
    {
      jobNumber: '1038',
      title: 'Ring Set',
      jewelryCategory: 'Rings',
      pieceCount: 12,
      requiredWeightGrams: 48,
      purity: 0.75,
      meltingGroup: 'Group A',
      laborRatePerPiece: 150,
      wastageAllowanceGrams: 1,
      dueDate: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      status: 'qualityCheck',
      karagarId: karagars[0]._id,
      karagarName: karagars[0].name,
      issuedWeightGrams: 48,
      returnedWeightGrams: 46.8,
    },
    {
      jobNumber: '1035',
      title: 'Earring Pairs',
      jewelryCategory: 'Earrings',
      pieceCount: 20,
      requiredWeightGrams: 60,
      purity: 0.916,
      meltingGroup: 'Group A',
      laborRatePerPiece: 120,
      wastageAllowanceGrams: 1,
      dueDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      status: 'completed',
      karagarId: karagars[1]._id,
      karagarName: karagars[1].name,
      issuedWeightGrams: 60,
      returnedWeightGrams: 59.2,
    },
    {
      jobNumber: '1044',
      title: 'Heavy Necklace',
      jewelryCategory: 'Necklaces',
      pieceCount: 2,
      requiredWeightGrams: 150,
      purity: 0.916,
      meltingGroup: 'Group B',
      laborRatePerPiece: 800,
      wastageAllowanceGrams: 3,
      dueDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
      status: 'inProgress',
      karagarId: karagars[2]._id,
      karagarName: karagars[2].name,
      issuedWeightGrams: 150,
      returnedWeightGrams: 0,
    },
  ]);
  console.log('Jobs seeded');

  // Treasury
  const treasury = await Treasury.create({
    openingReserveGrams: 1000,
    availableGoldGrams: 650,
    issuedGoldGrams: 420,
    returnedGoldGrams: 70,
  });

  await TreasuryTx.insertMany([
    {
      type: 'issuance',
      description: `Gold issued for Job #1042 to ${karagars[0].name}`,
      amountMg: -120000,
      balanceAfterMg: 650000,
      createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'issuance',
      description: `Gold issued for Job #1044 to ${karagars[2].name}`,
      amountMg: -150000,
      balanceAfterMg: 770000,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
    },
    {
      type: 'receipt',
      description: `Gold received from ${karagars[1].name} for Job #1035`,
      amountMg: 59200,
      balanceAfterMg: 920000,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log('Treasury seeded');

  // Advances
  await Advance.insertMany([
    {
      transactionId: 'ADV-A1B2C3D4',
      karagarId: karagars[0]._id,
      karagarName: karagars[0].name,
      amountRupees: 5000,
      repaidRupees: 2000,
      fullyRepaid: false,
      paymentMode: 'cash',
      purpose: 'Medical emergency',
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
    {
      transactionId: 'ADV-E5F6G7H8',
      karagarId: karagars[1]._id,
      karagarName: karagars[1].name,
      amountRupees: 3000,
      repaidRupees: 3000,
      fullyRepaid: true,
      paymentMode: 'upi',
      createdAt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
    },
    {
      transactionId: 'ADV-I9J0K1L2',
      karagarId: karagars[2]._id,
      karagarName: karagars[2].name,
      amountRupees: 8000,
      repaidRupees: 0,
      fullyRepaid: false,
      paymentMode: 'bankTransfer',
      purpose: 'House repair',
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
    },
  ]);
  console.log('Advances seeded');

  // Payrolls
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);
  await Payroll.insertMany([
    {
      karagarId: karagars[1]._id,
      karagarName: karagars[1].name,
      periodStart,
      periodEnd,
      jobsDone: 1,
      grossLaborRupees: 2400,
      approvedIncentiveRupees: 200,
      approvedPenaltyRupees: 0,
      advanceDeductionRupees: 1000,
      netPayableRupees: 1600,
      paidRupees: 1600,
      status: 'paid',
      wastageStatus: 'ok',
      actualWastageGrams: 0.8,
      allowedWastageGrams: 1,
    },
    {
      karagarId: karagars[0]._id,
      karagarName: karagars[0].name,
      periodStart,
      periodEnd,
      jobsDone: 0,
      grossLaborRupees: 0,
      netPayableRupees: 0,
      status: 'draft',
      wastageStatus: 'pending',
      actualWastageGrams: 0,
      allowedWastageGrams: 0,
    },
  ]);
  console.log('Payrolls seeded');

  console.log('\n✅ Seed complete!');
  console.log('Login credentials:');
  console.log('  admin    / demo1234  (role: admin)');
  console.log('  manager  / demo1234  (role: manager)');
  console.log('  karagar1 / demo1234  (role: karagar → Raju Kumar)');
  console.log('  karagar2 / demo1234  (role: karagar → Suresh Patil)');

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
