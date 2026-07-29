import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { supabaseAdmin } from '../server/supabaseAdmin.js';

const DEFAULT_LEVELS = { social: 3, nonverbal: 3, inference: 3 };
const DEFAULT_STREAKS = {
  social: { correct: 0, incorrect: 0 },
  nonverbal: { correct: 0, incorrect: 0 },
  inference: { correct: 0, incorrect: 0 },
};
// Difficulty is never derived from the profile — every new student starts
// here and the in-session adaptive engine takes it from there.
const DEFAULT_DIFFICULTY = { social: 1, nonverbal: 1, inference: 1 };

// Creates a kid's Supabase Auth user (synthetic email under the hood — see
// src/auth.ts) and links it to an existing, already-saved student_profiles
// row (profile creation and login creation are decoupled — see
// api/profile/save.ts). Only ever called by an authenticated parent, and
// the one place that uses the service-role key to admin-create an Auth user.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const parent = await verifyUser(req.headers.authorization);
    if (!parent) return res.status(401).json({ error: 'Unauthorized' });

    const {
      profileId,
      username,
      password,
      gender,
    }: {
      profileId?: string;
      username?: string;
      password?: string;
      gender?: 'girl' | 'boy' | 'other';
    } = req.body ?? {};

    if (!profileId || !username?.trim() || !password || password.length < 4) {
      return res.status(400).json({ error: 'Missing or invalid fields' });
    }

    // Confirm the caller owns this profile and it isn't already linked.
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('student_profiles')
      .select('id, parent_id, student_id, display_name, interests')
      .eq('id', profileId)
      .maybeSingle();

    if (profileError || !profile) return res.status(404).json({ error: 'Profile not found' });
    if (profile.parent_id !== parent.id) return res.status(403).json({ error: 'Not your profile' });
    if (profile.student_id) return res.status(409).json({ error: 'This profile already has a login' });

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
      display_name: profile.display_name,
      gender: gender ?? 'other',
    });
    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(studentId);
      return res.status(500).json({ error: 'Could not create student profile' });
    }

    const { error: linkError } = await supabaseAdmin
      .from('student_profiles')
      .update({ student_id: studentId })
      .eq('id', profileId);
    if (linkError) {
      await supabaseAdmin.auth.admin.deleteUser(studentId);
      await supabaseAdmin.from('students').delete().eq('id', studentId);
      return res.status(500).json({ error: 'Could not link profile to login' });
    }

    await Promise.all([
      supabaseAdmin.from('parent_config').insert({
        student_id: studentId, daily_minimum: 1, interests: profile.interests ?? [], kid_gender: gender ?? 'other',
      }),
      supabaseAdmin.from('coins_state').insert({
        student_id: studentId, balance: 0, total_earned: 0, hint_tokens: 0,
      }),
      supabaseAdmin.from('level_state').insert({
        student_id: studentId, levels: DEFAULT_LEVELS, streaks: DEFAULT_STREAKS,
      }),
      supabaseAdmin.from('difficulty_state').insert({ student_id: studentId, state: DEFAULT_DIFFICULTY }),
    ]);

    res.status(200).json({ studentId, username: normalizedUsername, displayName: profile.display_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not create student' });
  }
}
