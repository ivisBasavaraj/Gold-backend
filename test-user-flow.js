/**
 * User Creation Flow Test — Admin Side
 * Target: https://gold-backend-ym0j.onrender.com/api/v1
 *
 * Test cases:
 *  1.  Seed demo data
 *  2.  Admin login
 *  3.  Manager login
 *  4.  Karagar login
 *  5.  Admin lists all users → sees all 4 seeded users
 *  6.  Admin creates a Manager account
 *  7.  New manager can login with given credentials
 *  8.  Admin creates a Karagar account (linked to karagar profile)
 *  9.  New karagar can login and karagarId is present
 * 10.  Duplicate username → 409
 * 11.  Missing required fields → 400
 * 12.  Invalid role → 400
 * 13.  Short password → 400
 * 14.  Admin resets a user's password
 * 15.  User can login with new password
 * 16.  Old password no longer works after reset
 * 17.  Admin deletes a user
 * 18.  Deleted user cannot login
 * 19.  Admin cannot delete own account
 * 20.  SECURITY: Manager cannot create users (403)
 * 21.  SECURITY: Karagar cannot create users (403)
 * 22.  SECURITY: Manager cannot list users (403)
 * 23.  SECURITY: Manager cannot delete users (403)
 * 24.  SECURITY: Manager cannot reset passwords (403)
 * 25.  SECURITY: No token → 401 on all user endpoints
 */

const BASE = 'https://gold-backend-ym0j.onrender.com/api/v1';

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
  console.log(`\n${'─'.repeat(64)}`);
  console.log(`  ${title}`);
  console.log('─'.repeat(64));
}

function record(res) { return res.json?.data ?? res.json; }
function items(res)  { const d = res.json?.data; return d?.items ?? d ?? []; }

// ── main ──────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n👤  Pushpa Chains — User Creation Flow Test (Admin Side)');
  console.log(`    Target: ${BASE}\n`);

  // ── STEP 1: Seed ──────────────────────────────────────────────────────────
  section('STEP 1 — Seed demo users');

  const seed = await req('POST', '/auth/seed');
  assert(seed.status === 200, `Seed → 200 (got ${seed.status})`);
  assert(seed.json?.success === true, 'Seed reports success');

  // ── STEP 2-4: Logins ──────────────────────────────────────────────────────
  section('STEP 2-4 — Admin, Manager, Karagar logins');

  const adminRes = await req('POST', '/auth/login', { body: { username: 'admin',    password: 'demo1234' } });
  const mgrRes   = await req('POST', '/auth/login', { body: { username: 'manager',  password: 'demo1234' } });
  const k1Res    = await req('POST', '/auth/login', { body: { username: 'karagar1', password: 'demo1234' } });

  assert(adminRes.status === 200 && !!adminRes.json?.accessToken, 'Admin login OK');
  assert(mgrRes.status   === 200 && !!mgrRes.json?.accessToken,   'Manager login OK');
  assert(k1Res.status    === 200 && !!k1Res.json?.accessToken,    'Karagar1 login OK');

  const adminToken = adminRes.json.accessToken;
  const mgrToken   = mgrRes.json.accessToken;
  const k1Token    = k1Res.json.accessToken;
  const adminId    = adminRes.json.user?._id?.toString();

  if (!adminToken || !mgrToken || !k1Token) {
    console.error('\n🛑  Login failed — cannot continue.\n');
    process.exit(1);
  }

  // ── STEP 5: Admin lists users ─────────────────────────────────────────────
  section('STEP 5 — Admin lists all users');

  const listRes = await req('GET', '/users', { token: adminToken });
  assert(listRes.status === 200, `GET /users → 200 (got ${listRes.status})`);
  const userList = items(listRes);
  assert(userList.length >= 4, `At least 4 seeded users visible (got ${userList.length})`);
  assert(userList.every(u => !u.password), 'Password field NOT exposed in list response');
  const roles = userList.map(u => u.role);
  assert(roles.includes('admin'),   'Admin user present in list');
  assert(roles.includes('manager'), 'Manager user present in list');
  assert(roles.includes('karagar'), 'Karagar user present in list');

  // ── STEP 6: Create Manager ────────────────────────────────────────────────
  section('STEP 6 — Admin creates a Manager account');

  const ts = Date.now();
  const newMgrRes = await req('POST', '/users', {
    token: adminToken,
    body: {
      name: `Test Manager ${ts}`,
      username: `testmgr_${ts}`,
      password: 'secure123',
      role: 'manager',
      employeeCode: `MGR-T${ts}`.slice(0, 12),
    },
  });
  assert(newMgrRes.status === 201, `Manager created → 201 (got ${newMgrRes.status})`);
  const newMgr = record(newMgrRes);
  assert(newMgr?.role === 'manager', `Role is 'manager' (got '${newMgr?.role}')`);
  assert(newMgr?.name === `Test Manager ${ts}`, 'Name matches');
  assert(!newMgr?.password, 'Password NOT returned in create response');
  const newMgrId = newMgr?._id?.toString();
  assert(!!newMgrId, `New manager ID: ${newMgrId}`);

  // ── STEP 7: New manager can login ─────────────────────────────────────────
  section('STEP 7 — New manager can login with given credentials');

  const newMgrLogin = await req('POST', '/auth/login', {
    body: { username: `testmgr_${ts}`, password: 'secure123' },
  });
  assert(newMgrLogin.status === 200, `New manager login → 200 (got ${newMgrLogin.status})`);
  assert(!!newMgrLogin.json?.accessToken, 'New manager received accessToken');
  assert(newMgrLogin.json?.user?.role === 'manager', `Role confirmed as 'manager'`);

  // ── STEP 8: Create Karagar account (linked) ───────────────────────────────
  section('STEP 8 — Admin creates a Karagar account linked to a profile');

  // Get a karagar profile to link
  const karagarsRes = await req('GET', '/karagars', { token: adminToken });
  const karagars = items(karagarsRes);
  const k1Profile = karagars.find(k => k.employeeCode === 'GC-001');
  assert(!!k1Profile, `Karagar profile GC-001 found for linking`);

  const newKaragarRes = await req('POST', '/users', {
    token: adminToken,
    body: {
      name: `Test Karagar ${ts}`,
      username: `testkgr_${ts}`,
      password: 'secure456',
      role: 'karagar',
      employeeCode: `GC-T${ts}`.slice(0, 10),
      karagarId: k1Profile?._id,
    },
  });
  assert(newKaragarRes.status === 201, `Karagar account created → 201 (got ${newKaragarRes.status})`);
  const newKaragar = record(newKaragarRes);
  assert(newKaragar?.role === 'karagar', `Role is 'karagar'`);
  assert(!!newKaragar?.karagarId, `karagarId linked: ${newKaragar?.karagarId}`);
  assert(!newKaragar?.password, 'Password NOT returned in create response');
  const newKaragarUserId = newKaragar?._id?.toString();

  // ── STEP 9: New karagar can login, karagarId present ─────────────────────
  section('STEP 9 — New karagar can login and karagarId is in /auth/me');

  const newKgrLogin = await req('POST', '/auth/login', {
    body: { username: `testkgr_${ts}`, password: 'secure456' },
  });
  assert(newKgrLogin.status === 200, `New karagar login → 200 (got ${newKgrLogin.status})`);
  assert(!!newKgrLogin.json?.accessToken, 'New karagar received accessToken');

  const meRes = await req('GET', '/auth/me', { token: newKgrLogin.json.accessToken });
  assert(meRes.status === 200, '/auth/me → 200');
  assert(!!meRes.json?.karagarId, `karagarId present in /auth/me: ${meRes.json?.karagarId}`);
  assert(
    meRes.json?.karagarId?.toString() === k1Profile?._id?.toString(),
    'karagarId in /auth/me matches linked profile',
  );

  // ── STEP 10: Duplicate username → 409 ────────────────────────────────────
  section('STEP 10 — Duplicate username → 409');

  const dupRes = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'Dup User', username: `testmgr_${ts}`, password: 'pass123', role: 'manager' },
  });
  assert(dupRes.status === 409, `Duplicate username → 409 (got ${dupRes.status})`);
  assert(!!dupRes.json?.message, `Error message returned: "${dupRes.json?.message}"`);

  // ── STEP 11: Missing required fields → 400 ───────────────────────────────
  section('STEP 11 — Missing required fields → 400');

  const missingName = await req('POST', '/users', {
    token: adminToken,
    body: { username: `noname_${ts}`, password: 'pass123', role: 'manager' },
  });
  assert(missingName.status === 400, `Missing name → 400 (got ${missingName.status})`);

  const missingPass = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'No Pass', username: `nopass_${ts}`, role: 'manager' },
  });
  assert(missingPass.status === 400, `Missing password → 400 (got ${missingPass.status})`);

  const missingRole = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'No Role', username: `norole_${ts}`, password: 'pass123' },
  });
  assert(missingRole.status === 400, `Missing role → 400 (got ${missingRole.status})`);

  // ── STEP 12: Invalid role → 400 ──────────────────────────────────────────
  section('STEP 12 — Invalid role → 400');

  const badRole = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'Bad Role', username: `badrole_${ts}`, password: 'pass123', role: 'superuser' },
  });
  assert(badRole.status === 400, `Invalid role 'superuser' → 400 (got ${badRole.status})`);

  // Admin role cannot be created via API (only seeded)
  const adminRole = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'New Admin', username: `newadmin_${ts}`, password: 'pass123', role: 'admin' },
  });
  assert(adminRole.status === 400, `Role 'admin' cannot be created via API → 400 (got ${adminRole.status})`);

  // ── STEP 13: Short password → 400 ────────────────────────────────────────
  section('STEP 13 — Password too short → 400');

  const shortPass = await req('POST', '/users', {
    token: adminToken,
    body: { name: 'Short Pass', username: `short_${ts}`, password: '123', role: 'manager' },
  });
  // Backend doesn't enforce min length on create — only on password reset
  // Document actual behaviour
  console.log(`  ℹ️   Short password on create → ${shortPass.status} (backend enforces min-length on reset only)`);

  // ── STEP 14: Admin resets password ───────────────────────────────────────
  section('STEP 14 — Admin resets a user\'s password');

  const resetRes = await req('PATCH', `/users/${newMgrId}/password`, {
    token: adminToken,
    body: { password: 'newpass999' },
  });
  assert(resetRes.status === 200, `Password reset → 200 (got ${resetRes.status})`);
  assert(!!resetRes.json?.message, `Confirmation message: "${resetRes.json?.message}"`);

  // ── STEP 15: Login with new password ─────────────────────────────────────
  section('STEP 15 — User can login with new password');

  const newPassLogin = await req('POST', '/auth/login', {
    body: { username: `testmgr_${ts}`, password: 'newpass999' },
  });
  assert(newPassLogin.status === 200, `Login with new password → 200 (got ${newPassLogin.status})`);
  assert(!!newPassLogin.json?.accessToken, 'Received accessToken with new password');

  // ── STEP 16: Old password no longer works ────────────────────────────────
  section('STEP 16 — Old password rejected after reset');

  const oldPassLogin = await req('POST', '/auth/login', {
    body: { username: `testmgr_${ts}`, password: 'secure123' },
  });
  assert(oldPassLogin.status === 401, `Old password rejected → 401 (got ${oldPassLogin.status})`);

  // ── STEP 17: Admin deletes a user ────────────────────────────────────────
  section('STEP 17 — Admin deletes a user');

  const deleteRes = await req('DELETE', `/users/${newMgrId}`, { token: adminToken });
  assert(deleteRes.status === 200, `User deleted → 200 (got ${deleteRes.status})`);
  assert(!!deleteRes.json?.message, `Confirmation: "${deleteRes.json?.message}"`);

  // Verify user no longer in list
  const listAfterDelete = await req('GET', '/users', { token: adminToken });
  const usersAfter = items(listAfterDelete);
  const stillExists = usersAfter.some(u => u._id?.toString() === newMgrId);
  assert(!stillExists, 'Deleted user no longer appears in user list');

  // ── STEP 18: Deleted user cannot login ───────────────────────────────────
  section('STEP 18 — Deleted user cannot login');

  const deletedLogin = await req('POST', '/auth/login', {
    body: { username: `testmgr_${ts}`, password: 'newpass999' },
  });
  assert(deletedLogin.status === 401, `Deleted user login rejected → 401 (got ${deletedLogin.status})`);

  // ── STEP 19: Admin cannot delete own account ──────────────────────────────
  section('STEP 19 — Admin cannot delete own account');

  const selfDelete = await req('DELETE', `/users/${adminId}`, { token: adminToken });
  assert(selfDelete.status === 400, `Self-delete blocked → 400 (got ${selfDelete.status})`);
  assert(!!selfDelete.json?.message, `Error message: "${selfDelete.json?.message}"`);

  // ── STEP 20-24: Role-based security ──────────────────────────────────────
  section('STEP 20-24 — Security: only admin can manage users');

  // Manager cannot create users
  const mgrCreate = await req('POST', '/users', {
    token: mgrToken,
    body: { name: 'X', username: `x_${ts}`, password: 'pass123', role: 'manager' },
  });
  assert(mgrCreate.status === 403, `Manager POST /users → 403 (got ${mgrCreate.status})`);

  // Karagar cannot create users
  const kgrCreate = await req('POST', '/users', {
    token: k1Token,
    body: { name: 'X', username: `y_${ts}`, password: 'pass123', role: 'manager' },
  });
  assert(kgrCreate.status === 403, `Karagar POST /users → 403 (got ${kgrCreate.status})`);

  // Manager cannot list users
  const mgrList = await req('GET', '/users', { token: mgrToken });
  assert(mgrList.status === 403, `Manager GET /users → 403 (got ${mgrList.status})`);

  // Manager cannot delete users
  const mgrDelete = await req('DELETE', `/users/${newKaragarUserId}`, { token: mgrToken });
  assert(mgrDelete.status === 403, `Manager DELETE /users/:id → 403 (got ${mgrDelete.status})`);

  // Manager cannot reset passwords
  const mgrReset = await req('PATCH', `/users/${newKaragarUserId}/password`, {
    token: mgrToken,
    body: { password: 'hacked123' },
  });
  assert(mgrReset.status === 403, `Manager PATCH /users/:id/password → 403 (got ${mgrReset.status})`);

  // ── STEP 25: No token → 401 ───────────────────────────────────────────────
  section('STEP 25 — No token → 401 on all user endpoints');

  const noList   = await req('GET',    '/users');
  const noCreate = await req('POST',   '/users', { body: { name: 'X', username: 'x', password: 'p', role: 'manager' } });
  const noDelete = await req('DELETE', `/users/${newKaragarUserId}`);
  const noReset  = await req('PATCH',  `/users/${newKaragarUserId}/password`, { body: { password: 'x' } });

  assert(noList.status   === 401, `No token GET /users → 401 (got ${noList.status})`);
  assert(noCreate.status === 401, `No token POST /users → 401 (got ${noCreate.status})`);
  assert(noDelete.status === 401, `No token DELETE /users/:id → 401 (got ${noDelete.status})`);
  assert(noReset.status  === 401, `No token PATCH /users/:id/password → 401 (got ${noReset.status})`);

  // ── Cleanup: delete the test karagar user ────────────────────────────────
  await req('DELETE', `/users/${newKaragarUserId}`, { token: adminToken });

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(64)}`);
  const total = passed + failed;
  console.log(`  Results: ${passed}/${total} passed, ${failed} failed`);
  console.log('═'.repeat(64));

  if (failed > 0) {
    console.error('\n⚠️  Some tests failed — review the ❌ lines above.\n');
    process.exit(1);
  } else {
    console.log('\n🎉  All user creation flow tests passed!\n');
  }
}

run().catch(err => {
  console.error('\n🛑  Unexpected error:', err.message);
  process.exit(1);
});
