import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../server/verifyUser.js';
import { supabaseAsUser } from '../../server/asUser.js';
import { validateStudentProfile } from '../../src/profileValidation.js';
import type { StudentProfileInput } from '../../src/profileTypes';

// Uses the caller's own token (not the service-role client) — RLS's
// "parent_id = auth.uid()" policy already permits exactly this insert, so
// there's no need to bypass it.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const parent = await verifyUser(req.headers.authorization);
    if (!parent) return res.status(401).json({ error: 'Unauthorized' });

    const { profile }: { profile?: StudentProfileInput } = req.body ?? {};
    if (!profile) return res.status(400).json({ error: 'Missing profile' });

    const { valid, errors } = validateStudentProfile(profile);
    if (!valid) return res.status(400).json({ error: errors[0] });

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const { data, error } = await supabaseAsUser(token)
      .from('student_profiles')
      .insert({
        parent_id: parent.id,
        student_id: null,
        display_name: profile.display_name.trim(),
        grade: profile.grade,
        reading_level: profile.reading_level,
        strengths: profile.strengths,
        focus: profile.focus,
        supports: profile.supports,
        session_length_min: profile.session_length_min,
        interests: profile.interests,
        is_active: true,
      })
      .select('id, display_name')
      .single();

    if (error || !data) {
      return res.status(500).json({ error: error?.message ?? 'Could not save profile' });
    }

    res.status(200).json({ id: data.id, displayName: data.display_name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not save profile' });
  }
}
