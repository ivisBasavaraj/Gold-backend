/**
 * clear-data.js
 * Clears all operational data from the DB while preserving:
 *  - users (managers, admins, karagar logins)
 *  - karagars (karagar profiles — but resets running totals)
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');

async function clearData() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB:', process.env.MONGO_URI.split('@')[1]);

  const collections = [
    'jobs',
    'job_status_histories',
    'material_issuances',
    'material_receipts',
    'advances',
    'advance_repayments',
    'payrolls',
    'treasury_transactions',
    'treasury_summaries',
    'audit_logs',
    'refresh_tokens',
  ];

  for (const col of collections) {
    try {
      const result = await mongoose.connection.collection(col).deleteMany({});
      console.log(`✅ Cleared ${col}: ${result.deletedCount} documents deleted`);
    } catch (e) {
      console.log(`⚠️  Skipped ${col}: ${e.message}`);
    }
  }

  // Reset karagar running totals so dashboard stats start from zero
  const karagarResult = await mongoose.connection.collection('karagars').updateMany({}, {
    $set: {
      activeJobCount: 0,
      totalIssuedGrams: 0,
      totalReturnedGrams: 0,
    },
  });
  console.log(`\n🔄 Reset karagar totals for ${karagarResult.modifiedCount} karagars`);

  // Verify users and karagars are untouched
  const userCount    = await mongoose.connection.collection('users').countDocuments();
  const karagarCount = await mongoose.connection.collection('karagars').countDocuments();
  console.log(`🔒 Preserved ${userCount} users and ${karagarCount} karagars`);

  console.log('\n✅ Data cleared successfully!');
  await mongoose.disconnect();
}

clearData().catch((err) => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
