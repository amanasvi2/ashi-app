import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser';
import { supabaseAdmin } from '../server/supabaseAdmin';

const DEFAULT_ITEM_TYPE_WEIGHTS = { social: 1, nonverbal: 1, inference: 1 };
const DEFAULT_DIFFICULTY = { social: 1, nonverbal: 1, inference: 1 };
const DEFAULT_LEVELS = { social: 2, nonverbal: 2, inference: 2 };
const DEFAULT_STREAKS = {
  social: { correct: 0, incorrect: 0 },
  nonverbal: { correct: 0, incorrect: 0 },
  inference: { correct: 0, incorrect: 0 },
};

interface TailoringProfileInput {
  iepId?: string;
  itemTypeWeights: Record<string, number>;
  initialDifficulty: Record<string, number>;
  goalsSummary: string[];
  parentExplanation: string;
}

// Creates a kid's Supabase Auth user (synthetic email under the hood — see
// src/auth.ts) plus their students row and default state rows. Only ever
// called by an authenticated parent, and only ever the one place that uses
// the service-role key to admin-create an Auth user.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parent = await verifyUser(req.headers.authorization);
  if (!parent) return res.status(401).json({ error: 'Unauthorized' });

  const {
    username,
    password,
    displayName,
    gender,
    tailoringProfile,
  }: {
    username?: string;
    password?: string;
    displayName?: string;
    gender?: 'girl' | 'boy' | 'other';
    tailoringProfile?: TailoringProfileInput;
  } = req.body ?? {};

  if (!username?.trim() || !password || password.length < 4 || !displayName?.trim()) {
    return res.status(400).json({ error: 'Missing or invalid fields' });
  }

  const normalizedUsername = username.trim().toLowerCase();

  const { data: existing } = await supabaseAdmin
    .from('students')
    .select('id')
    .eq('username', normalizedUsername)
    .maybeSingle();
  if (existing) return res.status(409).json({ error: 'That username is already taken' });

  const syntheticEmail = `${normalizedUsername}@kids.ashi.app`;

  const { data: created, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  });
  if (createError || !created.user) {
    return res.status(500).json({ error: createError?.message ?? 'Could not create student account' });
  }

  const studentId = created.user.id;

  const { error: insertError } = await supabaseAdmin.from('students').insert({
    id: studentId,
    parent_id: parent.id,
    username: normalizedUsername,
    display_name: displayName.trim(),
    gender: gender ?? 'other',
  });
  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(studentId);
    return res.status(500).json({ error: 'Could not create student profile' });
  }

  const difficulty = tailoringProfile?.initialDifficulty ?? DEFAULT_DIFFICULTY;

  await Promise.all([
    supabaseAdmin.from('parent_config').insert({
      student_id: studentId, daily_minimum: 1, interests: [], kid_gender: gender ?? 'other',
    }),
    supabaseAdmin.from('coins_state').insert({
      student_id: studentId, balance: 0, total_earned: 0, hint_tokens: 0,
    }),
    supabaseAdmin.from('level_state').insert({
      student_id: studentId, levels: DEFAULT_LEVELS, streaks: DEFAULT_STREAKS,
    }),
    supabaseAdmin.from('difficulty_state').insert({ student_id: studentId, state: difficulty }),
    supabaseAdmin.from('tailoring_profiles').insert({
      student_id: studentId,
      iep_id: tailoringProfile?.iepId ?? null,
      item_type_weights: tailoringProfile?.itemTypeWeights ?? DEFAULT_ITEM_TYPE_WEIGHTS,
      initial_difficulty: difficulty,
      goals_summary: tailoringProfile?.goalsSummary ?? [],
      parent_explanation: tailoringProfile?.parentExplanation ?? '',
      is_active: true,
    }),
  ]);

  res.status(200).json({ studentId, username: normalizedUsername, displayName: displayName.trim() });
}
