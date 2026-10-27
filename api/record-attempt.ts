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
    const client = supabaseAsUser(token);
    const { source = 'generated', carryoverItemId } = req.body ?? {};
    if (!['generated','carryover'].includes(source)) return res.status(400).json({error:'Invalid item source'});
    let provenance = {};
    if (source === 'carryover') {
      const { data: approved } = await client.from('carryover_items').select('id,skill_id,item,difficulty')
        .eq('id',carryoverItemId).eq('student_id',user.id).eq('status','approved').maybeSingle();
      if (!approved || approved.item.type !== itemType || approved.difficulty !== difficulty) return res.status(400).json({error:'Approved carryover item not found'});
      provenance = { source, carryover_item_id:approved.id, skill_id:approved.skill_id };
    }
    const { error } = await client.from('item_attempts').insert({
      ...provenance,
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
