import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { supabaseAsUser } from '../server/asUser.js';
import {
  rollingAdjusted, nextDifficulty, nextMastery, isFloorAlarm,
} from '../src/adaptiveEngine.js';
import type { Attempt } from '../src/adaptiveEngine.js';
import type { ItemType, SupportLevel, Difficulty } from '../src/types';

const WINDOW_SIZE = 10;
const DIFFICULTY_MIN_COUNT = 8;
const MASTERY_FLOOR_MIN_COUNT = 10;

// Called once per affected type at session end. Reads that type's last-10
// item_attempts (across sessions, not just this one), runs the
// chance-corrected rolling accuracy through adaptiveEngine.ts, and persists
// the resulting difficulty/mastery/floor-alarm. Support level itself is
// untouched here — level changes are queued client-side and applied only
// at the next session boundary (see storage.ts's loadLevelSlice).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const { types }: { types?: ItemType[] } = req.body ?? {};
    if (!types || types.length === 0) return res.status(400).json({ error: 'Missing types' });

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const client = supabaseAsUser(token);

    const [{ data: levelRow }, { data: diffRow }] = await Promise.all([
      client.from('level_state').select('levels').eq('student_id', user.id).maybeSingle(),
      client.from('difficulty_state').select('state, mastery, floor_alarm').eq('student_id', user.id).maybeSingle(),
    ]);

    if (!levelRow || !diffRow) return res.status(404).json({ error: 'Student state not found' });

    const levels: Record<ItemType, SupportLevel> = levelRow.levels;
    const difficulty: Record<ItemType, Difficulty> = { ...diffRow.state };
    const mastery: Record<ItemType, boolean> = { ...diffRow.mastery };
    const floorAlarm: Record<ItemType, boolean> = { ...diffRow.floor_alarm };

    for (const type of types) {
      const { data: rows } = await client
        .from('item_attempts')
        .select('result, option_count')
        .eq('student_id', user.id)
        .eq('item_type', type)
        .order('created_at', { ascending: false })
        .limit(WINDOW_SIZE);

      const attempts: Attempt[] = (rows ?? []).map(r => ({ result: r.result, optionCount: r.option_count }));
      const supportLevel = levels[type];

      const rollingForDifficulty = rollingAdjusted(attempts, DIFFICULTY_MIN_COUNT);
      const newDifficulty = nextDifficulty(difficulty[type], rollingForDifficulty, supportLevel);

      const rollingForMastery = rollingAdjusted(attempts, MASTERY_FLOOR_MIN_COUNT);
      const newMastery = nextMastery(mastery[type], supportLevel, newDifficulty, rollingForMastery);
      const newFloorAlarm = isFloorAlarm(supportLevel, newDifficulty, rollingForMastery);

      difficulty[type] = newDifficulty;
      mastery[type] = newMastery;
      floorAlarm[type] = newFloorAlarm;
    }

    await client.from('difficulty_state')
      .update({ state: difficulty, mastery, floor_alarm: floorAlarm })
      .eq('student_id', user.id);

    res.status(200).json({ difficulty, mastery, floorAlarm });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Could not recompute difficulty' });
  }
}
