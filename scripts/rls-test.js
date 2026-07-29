// Live-project RLS integration test. Creates two fully-tagged, throwaway
// owner+student pairs directly in the real Supabase project via the
// service-role key, gets each one's *real* JWT via a normal sign-in, and
// runs the actual cross-tenant queries a malicious or buggy client could
// attempt — asserting every one returns zero rows, not just checking the
// SQL by eye. Deletes everything it created in a `finally`, regardless of
// pass/fail.
//
// Run with:  npm run test:rls
// (loads .env.local itself — see the package.json script for how)
//
// This is intentionally NOT part of `npm test` / `vitest run`: it touches
// the same live database real users' data lives in, however briefly and
// however well-tagged. Run it by hand when RLS policies change.

import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
  console.error('Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY in the environment.');
  process.exit(1);
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
const RUN_ID = randomUUID().slice(0, 8);
const PASSWORD = `RlsTest-${randomUUID()}`;

const createdAuthUserIds = [];
let failures = 0;

function ok(label) {
  console.log(`  ok   ${label}`);
}
function fail(label, detail) {
  failures++;
  console.error(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`);
}

async function assertZeroRows(label, queryPromise) {
  const { data, error } = await queryPromise;
  if (error) return fail(label, `query errored instead of being silently filtered: ${error.message}`);
  if (!Array.isArray(data)) return fail(label, `expected an array, got ${JSON.stringify(data)}`);
  if (data.length !== 0) return fail(label, `expected 0 rows, got ${data.length}`);
  ok(label);
}

// ── Create one tagged owner + student pair, with one real row in every ────
// ── student_id-keyed table so there's something real to fail to see. ──────
async function seedFamily(tag) {
  const ownerEmail = `rls-test-owner-${tag}-${RUN_ID}@rls-test.ashi.app`;
  const { data: ownerAuth, error: ownerAuthErr } = await admin.auth.admin.createUser({
    email: ownerEmail, password: PASSWORD, email_confirm: true,
  });
  if (ownerAuthErr || !ownerAuth.user) throw new Error(`Could not create owner ${tag}: ${ownerAuthErr?.message}`);
  createdAuthUserIds.push(ownerAuth.user.id);

  const { error: ownerRowErr } = await admin.from('owners').insert({ id: ownerAuth.user.id, owner_type: 'parent' });
  if (ownerRowErr) throw new Error(`Could not seed owners row for ${tag}: ${ownerRowErr.message}`);

  const { data: profileRow, error: profileErr } = await admin.from('student_profiles').insert({
    owner_id: ownerAuth.user.id,
    display_name: `RLS Test ${tag}`,
    grade: 7,
    reading_level: 7,
    interests: ['testing'],
    is_active: true,
  }).select('id').single();
  if (profileErr || !profileRow) throw new Error(`Could not seed student_profiles for ${tag}: ${profileErr?.message}`);

  const studentEmail = `rls-test-student-${tag}-${RUN_ID}@kids.ashi.app`;
  const { data: studentAuth, error: studentAuthErr } = await admin.auth.admin.createUser({
    email: studentEmail, password: PASSWORD, email_confirm: true,
  });
  if (studentAuthErr || !studentAuth.user) throw new Error(`Could not create student ${tag}: ${studentAuthErr?.message}`);
  createdAuthUserIds.push(studentAuth.user.id);

  const studentId = studentAuth.user.id;
  const { error: studentRowErr } = await admin.from('students').insert({
    id: studentId, owner_id: ownerAuth.user.id, username: `rlstest_${tag}_${RUN_ID}`, display_name: `RLS Test ${tag}`,
  });
  if (studentRowErr) throw new Error(`Could not seed students row for ${tag}: ${studentRowErr.message}`);

  await admin.from('student_profiles').update({ student_id: studentId }).eq('id', profileRow.id);

  const seeds = await Promise.all([
    admin.from('parent_config').insert({ student_id: studentId }),
    admin.from('coins_state').insert({ student_id: studentId, balance: 42 }),
    admin.from('level_state').insert({
      student_id: studentId,
      levels: { social: 3, nonverbal: 3, inference: 3 },
      streaks: { social: { correct: 0, incorrect: 0 }, nonverbal: { correct: 0, incorrect: 0 }, inference: { correct: 0, incorrect: 0 } },
    }),
    admin.from('difficulty_state').insert({ student_id: studentId, state: { social: 1, nonverbal: 1, inference: 1 } }),
    admin.from('practice_sessions').insert({
      student_id: studentId, mode: 'mixed', score: 3, max_score: 5, item_count: 5, ended_by: 'completed',
      level_snapshot: { social: 3, nonverbal: 3, inference: 3 }, difficulty_snapshot: { social: 1, nonverbal: 1, inference: 1 },
    }),
    admin.from('item_attempts').insert({ student_id: studentId, item_type: 'social', support_level: 3, difficulty: 1, result: 'correct' }),
    admin.from('custom_rewards').insert({ student_id: studentId, label: 'Test reward', emoji: '🎬', url: 'https://example.com', cost: 10 }),
    admin.from('journal_entries').insert({
      student_id: studentId, mood: 'happy',
      content: 'SENSITIVE — if any owner query ever returns this, RLS is broken.',
    }),
  ]);
  for (const { error } of seeds) if (error) throw new Error(`Seeding a ${tag} row failed: ${error.message}`);

  // Real JWTs, not service-role — this is what a live client would carry.
  const anonForSignIn = createClient(SUPABASE_URL, ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } });
  const { data: ownerSignIn, error: ownerSignInErr } = await anonForSignIn.auth.signInWithPassword({ email: ownerEmail, password: PASSWORD });
  if (ownerSignInErr || !ownerSignIn.session) throw new Error(`Owner ${tag} could not sign in: ${ownerSignInErr?.message}`);
  const { data: studentSignIn, error: studentSignInErr } = await anonForSignIn.auth.signInWithPassword({ email: studentEmail, password: PASSWORD });
  if (studentSignInErr || !studentSignIn.session) throw new Error(`Student ${tag} could not sign in: ${studentSignInErr?.message}`);

  return {
    ownerId: ownerAuth.user.id,
    studentId,
    ownerClient: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${ownerSignIn.session.access_token}` } },
    }),
    studentClient: createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${studentSignIn.session.access_token}` } },
    }),
  };
}

async function run() {
  console.log(`RLS cross-tenant test (run ${RUN_ID})`);
  console.log('Seeding two tagged owner+student pairs...');
  const a = await seedFamily('a');
  const b = await seedFamily('b');
  console.log('Seeded. Running cross-tenant assertions...\n');

  const STUDENT_KEYED_TABLES = [
    'students', 'student_profiles', 'level_state', 'difficulty_state',
    'coins_state', 'practice_sessions', 'item_attempts', 'custom_rewards', 'parent_config',
  ];

  console.log('Owner B reading Owner A\'s student data (must all be empty):');
  for (const table of STUDENT_KEYED_TABLES) {
    await assertZeroRows(
      `owner B -> ${table} where student_id = A's student`,
      b.ownerClient.from(table).select('*').eq(table === 'students' ? 'id' : 'student_id', a.studentId),
    );
  }

  console.log("\nStudent B reading Student A's own data (must all be empty):");
  for (const table of STUDENT_KEYED_TABLES) {
    await assertZeroRows(
      `student B -> ${table} where student_id = A's student`,
      b.studentClient.from(table).select('*').eq(table === 'students' ? 'id' : 'student_id', a.studentId),
    );
  }

  console.log('\nJournal privacy (the one place even the correct owner must see nothing but dates):');
  await assertZeroRows(
    "owner A directly querying journal_entries for their OWN student (should still be zero — no owner-read policy exists at all)",
    a.ownerClient.from('journal_entries').select('*').eq('student_id', a.studentId),
  );
  {
    const { data, error } = await b.ownerClient.rpc('journal_activity_for_owner', { p_student_id: a.studentId });
    if (error) fail('owner B calling journal_activity_for_owner for A\'s student', error.message);
    else if ((data ?? []).length !== 0) fail('owner B calling journal_activity_for_owner for A\'s student', `expected 0 rows, got ${data.length}`);
    else ok('owner B calling journal_activity_for_owner for A\'s student returns zero rows');
  }
  {
    const { data, error } = await a.ownerClient.rpc('journal_activity_for_owner', { p_student_id: a.studentId });
    if (error) fail('owner A calling journal_activity_for_owner for their own student', error.message);
    else if ((data ?? []).length === 0) fail('owner A calling journal_activity_for_owner for their own student', 'expected the one seeded entry\'s date, got 0 rows');
    else if (Object.keys(data[0]).some(k => k !== 'date')) fail('journal_activity_for_owner leaks extra columns', JSON.stringify(data[0]));
    else ok("owner A sees only the entry's date via the RPC (no mood/content column present)");
  }

  console.log(`\n${failures === 0 ? 'All checks passed.' : `${failures} check(s) FAILED.`}`);
  return failures;
}

run()
  .then(async failCount => {
    await cleanup();
    process.exit(failCount === 0 ? 0 : 1);
  })
  .catch(async err => {
    console.error('\nRLS test crashed:', err);
    await cleanup();
    process.exit(1);
  });

async function cleanup() {
  console.log('\nCleaning up test accounts...');
  for (const id of createdAuthUserIds) {
    const { error } = await admin.auth.admin.deleteUser(id);
    if (error) console.error(`  Could not delete auth user ${id}: ${error.message} — remove it manually.`);
  }
  console.log('Cleanup done.');
}
