import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { supabaseAsUser } from '../server/asUser.js';

// One row per answered item — the history every rolling-window rule in
// adaptiveEngine.ts reads. Uses the caller's own token (not the service-role
// client): RLS's "student_id = auth.uid()" policy already permits exactly
// this insert.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      itemType, supportLevel, difficulty, optionCount, result,
    }: {
      itemType?: 'social' | 'nonverbal' | 'inference';
      supportLevel?: number;
      difficulty?: number;
      optionCount?: number | null;
      result?: 'correct' | 'partial' | 'incorrect';
    } = req.body ?? {};

    if (!itemType || supportLevel === undefined || !difficulty || !result) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const { error } = await supabaseAsUser(token).from('item_attempts').insert({
      student_id: user.id,
      item_type: itemType,
      support_level: supportLevel,
      difficulty,
      option_count: optionCount ?? null,
      result,
    });

    if (error) return res.status(500).json({ error: error.message });
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not record attempt' });
  }
}
