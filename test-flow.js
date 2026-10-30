/**
 * Flow Test: Karagar-Scoped Gold Issuance & Receipt
 * Target: Express backend at http://localhost:3000/api/v1
 *
 * Test cases:
 *  1.  Seed demo users + karagar profiles
 *  2.  Manager login
 *  3.  Karagar1 login  (karagarId linked via token)
 *  4.  Karagar2 login
 *  5.  Manager assigns Job1 to Karagar1
 *  6.  Manager assigns Job2 to Karagar2
 *  7.  Manager issues gold for Job1 (Karagar1)
 *  8.  Manager issues gold for Job2 (Karagar2)
 *  9.  Manager records receipt for Job1 (Karagar1)
 *  10. GET /material-issuance/my as Karagar1 → only Karagar1 records
 *  11. GET /material-receipts/my  as Karagar1 → only Karagar1 records
 *  12. GET /material-issuance/my as Karagar2 → only Karagar2 records
 *  13. Cross-check: Karagar1 /my does NOT contain Karagar2 data
 *  14. Cross-check: Karagar2 /my does NOT contain Karagar1 data
 *  15. SECURITY: No token → 401 on /my
 *  16. SECURITY: Manager token → 403 on karagar-only /my  (role guard)
 *  17. SECURITY: karagarId is derived from token, not from query param
 *  18. Verify issuance karagarId matches job's karagar (server-side derivation)
 */

const BASE = 'http://localhost:3000/api/v1';

let passed = 0;
let failed = 0;

function assert(condition, label) {
  if (condition) {
    console.log(`  ✅  ${label}`);
    passed++;
  } else {
    console.error(`  ❌  ${label}`);
    failed++;
  }
}

async function req(method, path, { token, body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch (_) {}
  return { status: res.status, json };
}

function section(title) {
  console.log(`\n${'─'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(62));
}

// ── main ─────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n🔶  Pushpa Chains — Karagar Gold Flow Test');
  console.log(`    Target: ${BASE}\n`);

  // ── STEP 1: Seed ──────────────────────────────────────────────────────────
  section('STEP 1 — Seed demo users + karagar profiles');

  const seed = await req('POST', '/auth/seed');
  assert(seed.status === 200, `Seed → 200 (got ${seed.status})`);
  assert(seed.json?.success === true, 'Seed reports success');
  assert(Array.isArray(seed.json?.users) && seed.json.users.length === 4, 'Seed created 4 users');

  // ── STEP 2-4: Logins ──────────────────────────────────────────────────────
  section('STEP 2-4 — Logins');

  const mgrRes = await req('POST', '/auth/login', { body: { username: 'manager', password: 'demo1234' } });
  assert(mgrRes.status === 200, `Manager login → 200`);
  assert(!!mgrRes.json?.accessToken, 'Manager received accessToken');
  const mgrToken = mgrRes.json?.accessToken;

  const k1Res = await req('POST', '/auth/login', { body: { username: 'karagar1', password: 'demo1234' } });
  assert(k1Res.status === 200, `Karagar1 login → 200`);
  assert(!!k1Res.json?.accessToken, 'Karagar1 received accessToken');
  const k1Token = k1Res.json?.accessToken;
  const k1UserId = k1Res.json?.user?._id;

  const k2Res = await req('POST', '/auth/login', { body: { username: 'karagar2', password: 'demo1234' } });
  assert(k2Res.status === 200, `Karagar2 login → 200`);
  assert(!!k2Res.json?.accessToken, 'Karagar2 received accessToken');
  const k2Token = k2Res.json?.accessToken;

  if (!mgrToken || !k1Token || !k2Token) {
    console.error('\n🛑  Cannot continue — one or more logins failed.\n');
    process.exit(1);
  }

  // Resolve karagar profile IDs from the karagars list
  const karagarsRes = await req('GET', '/karagars', { token: mgrToken });
  const karagars = karagarsRes.json?.data?.items ?? [];
  const k1Profile = karagars.find(k => k.employeeCode === 'GC-001');
  const k2Profile = karagars.find(k => k.employeeCode === 'GC-002');
  assert(!!k1Profile, `Karagar1 profile found (id: ${k1Profile?._id})`);
  assert(!!k2Profile, `Karagar2 profile found (id: ${k2Profile?._id})`);
  const k1KaragarId = k1Profile?._id?.toString();
  const k2KaragarId = k2Profile?._id?.toString();

  // Verify karagarId is embedded in the token (via /auth/me)
  const meRes = await req('GET', '/auth/me', { token: k1Token });
  assert(meRes.status === 200, 'Karagar1 /auth/me → 200');
  const k1KaragarIdFromToken = meRes.json?.karagarId?.toString();
  assert(
    k1KaragarIdFromToken === k1KaragarId,
    `karagarId in token matches profile (${k1KaragarIdFromToken})`,
  );

  // ── STEP 5-6: Assign jobs ─────────────────────────────────────────────────
  section('STEP 5-6 — Manager assigns jobs');

  const ts = Date.now();

  const job1Res = await req('POST', '/jobs', {
    token: mgrToken,
    body: {
      title: `Necklace Test ${ts}`,
      jewelryCategory: 'Necklace',
      pieceCount: 5,
      requiredWeightGrams: 50,
      purity: 0.916,
      meltingGroup: 'A',
      laborRatePerPiece: 500,
      wastageAllowanceGrams: 0.5,
      dueDate: new Date(Date.now() + 7 * 86400000).toISOString(),
      karagarId: k1KaragarId,
    },
  });
  assert(job1Res.status === 201, `Job1 assigned to Karagar1 → 201 (got ${job1Res.status})`);
  const job1Id = job1Res.json?.data?._id?.toString();
  assert(!!job1Id, `Job1 ID: ${job1Id}`);
  assert(
    job1Res.json?.data?.karagarId?.toString() === k1KaragarId,
    `Job1 karagarId matches Karagar1`,
  );

  const job2Res = await req('POST', '/jobs', {
    token: mgrToken,
    body: {
      title: `Bangles Test ${ts}`,
      jewelryCategory: 'Bangles',
      pieceCount: 10,
      requiredWeightGrams: 80,
      purity: 0.750,
      meltingGroup: 'B',
      laborRatePerPiece: 300,
      wastageAllowanceGrams: 0.8,
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString(),
      karagarId: k2KaragarId,
    },
  });
  assert(job2Res.status === 201, `Job2 assigned to Karagar2 → 201 (got ${job2Res.status})`);
  const job2Id = job2Res.json?.data?._id?.toString();
  assert(!!job2Id, `Job2 ID: ${job2Id}`);

  // ── STEP 7-8: Issue gold ──────────────────────────────────────────────────
  section('STEP 7-8 — Manager issues gold');

  const iss1Res = await req('POST', '/material-issuance', {
    token: mgrToken,
    body: { jobId: job1Id, physicalWeightMg: 50000, purity: 0.916, notes: 'Test K1' },
  });
  assert(iss1Res.status === 201, `Issuance for Job1/Karagar1 → 201 (got ${iss1Res.status})`);
  const iss1 = iss1Res.json?.data;
  assert(!!iss1?.transactionId, `Issuance1 transactionId: ${iss1?.transactionId}`);

  // STEP 18: karagarId derived from job on server, not from client body
  assert(
    iss1?.karagarId?.toString() === k1KaragarId,
    `Issuance1 karagarId derived server-side from job (${iss1?.karagarId}) — not client-supplied`,
  );

  const iss2Res = await req('POST', '/material-issuance', {
    token: mgrToken,
    body: { jobId: job2Id, physicalWeightMg: 80000, purity: 0.750, notes: 'Test K2' },
  });
  assert(iss2Res.status === 201, `Issuance for Job2/Karagar2 → 201 (got ${iss2Res.status})`);
  const iss2 = iss2Res.json?.data;
  assert(!!iss2?.transactionId, `Issuance2 transactionId: ${iss2?.transactionId}`);
  assert(
    iss2?.karagarId?.toString() === k2KaragarId,
    `Issuance2 karagarId derived server-side from job (${iss2?.karagarId})`,
  );

  // ── STEP 9: Record receipt ────────────────────────────────────────────────
  section('STEP 9 — Manager records receipt for Karagar1');

  const rec1Res = await req('POST', '/material-receipts', {
    token: mgrToken,
    body: {
      jobId: job1Id,
      receiptType: 'finishedProduct',
      physicalWeightMg: 48000,
      purity: 0.916,
      notes: 'Test receipt K1',
    },
  });
  assert(rec1Res.status === 201, `Receipt for Job1/Karagar1 → 201 (got ${rec1Res.status})`);
  const rec1 = rec1Res.json?.data;
  assert(!!rec1?.transactionId, `Receipt1 transactionId: ${rec1?.transactionId}`);
  assert(
    rec1?.karagarId?.toString() === k1KaragarId,
    `Receipt1 karagarId derived server-side from job`,
  );

  // ── STEP 10-12: /my scoping ───────────────────────────────────────────────
  section('STEP 10-12 — /my endpoints return only own records');

  // Karagar1 issuances
  const myIss1Res = await req('GET', '/material-issuance/my', { token: k1Token });
  assert(myIss1Res.status === 200, `Karagar1 GET /material-issuance/my → 200`);
  const myIss1 = myIss1Res.json?.data?.items ?? [];
  assert(myIss1.length >= 1, `Karagar1 sees ≥1 issuance (got ${myIss1.length})`);

  // Karagar1 receipts
  const myRec1Res = await req('GET', '/material-receipts/my', { token: k1Token });
  assert(myRec1Res.status === 200, `Karagar1 GET /material-receipts/my → 200`);
  const myRec1 = myRec1Res.json?.data?.items ?? [];
  assert(myRec1.length >= 1, `Karagar1 sees ≥1 receipt (got ${myRec1.length})`);

  // Karagar2 issuances
  const myIss2Res = await req('GET', '/material-issuance/my', { token: k2Token });
  assert(myIss2Res.status === 200, `Karagar2 GET /material-issuance/my → 200`);
  const myIss2 = myIss2Res.json?.data?.items ?? [];
  assert(myIss2.length >= 1, `Karagar2 sees ≥1 issuance (got ${myIss2.length})`);

  // ── STEP 13-14: Cross-contamination checks ────────────────────────────────
  section('STEP 13-14 — No cross-contamination between karagars');

  const k1IssAllOwnedByK1 = myIss1.every(i => i.karagarId?.toString() === k1KaragarId);
  assert(k1IssAllOwnedByK1, 'All Karagar1 /my issuances belong to Karagar1');

  const k2InK1 = myIss1.some(i => i.karagarId?.toString() === k2KaragarId);
  assert(!k2InK1, 'Karagar2 records NOT visible in Karagar1 /my issuances');

  const k2IssAllOwnedByK2 = myIss2.every(i => i.karagarId?.toString() === k2KaragarId);
  assert(k2IssAllOwnedByK2, 'All Karagar2 /my issuances belong to Karagar2');

  const k1InK2 = myIss2.some(i => i.karagarId?.toString() === k1KaragarId);
  assert(!k1InK2, 'Karagar1 records NOT visible in Karagar2 /my issuances');

  const k1RecAllOwnedByK1 = myRec1.every(i => i.karagarId?.toString() === k1KaragarId);
  assert(k1RecAllOwnedByK1, 'All Karagar1 /my receipts belong to Karagar1');

  // ── STEP 15-17: Security ──────────────────────────────────────────────────
  section('STEP 15-17 — Security: auth guard & role enforcement');

  // No token → 401
  const noAuthIss = await req('GET', '/material-issuance/my');
  assert(noAuthIss.status === 401, `No token on /material-issuance/my → 401 (got ${noAuthIss.status})`);

  const noAuthRec = await req('GET', '/material-receipts/my');
  assert(noAuthRec.status === 401, `No token on /material-receipts/my → 401 (got ${noAuthRec.status})`);

  // Manager calling /my → 403 (no karagarId on manager account)
  const mgrMyIss = await req('GET', '/material-issuance/my', { token: mgrToken });
  assert(mgrMyIss.status === 403, `Manager on /material-issuance/my → 403 (got ${mgrMyIss.status})`);

  const mgrMyRec = await req('GET', '/material-receipts/my', { token: mgrToken });
  assert(mgrMyRec.status === 403, `Manager on /material-receipts/my → 403 (got ${mgrMyRec.status})`);

  // STEP 17: Attempt to spoof karagarId via query param — must be ignored
  // Karagar2 tries to pass Karagar1's karagarId as a query param on /my
  const spoofRes = await req('GET', `/material-issuance/my?karagarId=${k1KaragarId}`, { token: k2Token });
  assert(spoofRes.status === 200, `Spoof attempt returns 200 (endpoint still works)`);
  const spoofItems = spoofRes.json?.data?.items ?? [];
  const spoofContainsK1 = spoofItems.some(i => i.karagarId?.toString() === k1KaragarId);
  assert(!spoofContainsK1, `Spoofed karagarId query param ignored — Karagar1 data NOT returned to Karagar2`);
  const spoofAllK2 = spoofItems.every(i => i.karagarId?.toString() === k2KaragarId);
  assert(spoofAllK2 || spoofItems.length === 0, `All items in spoof response still belong to Karagar2`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(62)}`);
  const total = passed + failed;
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('═'.repeat(62));

  if (failed > 0) {
    console.error('\n⚠️  Some tests failed — review the ❌ lines above.\n');
    process.exit(1);
  } else {
    console.log('\n🎉  All tests passed!\n');
  }
}

run().catch(err => {
  console.error('\n🛑  Unexpected error:', err.message);
  process.exit(1);
});
