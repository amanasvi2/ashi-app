import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../server/verifyUser.js';
import { groqChat } from '../../server/groq.js';
import { supabaseAsUser } from '../../server/asUser.js';
import { deriveItemTypeWeights } from '../../server/skillMapping.js';
import { applyMasteryToWeights, excludeFloorAlarmed } from '../../src/adaptiveEngine.js';
import type { Item, SessionMode, DifficultyState, Difficulty, ItemType, LevelState } from '../../src/types';

function difficultyLabel(d: Difficulty): string {
  if (d === 1) return '1 (easy — answer is clear from direct context clues)';
  if (d === 2) return '2 (medium — requires connecting two or more ideas)';
  return '3 (hard — answer is implied but not obvious, needs careful reading)';
}

function buildPrompt(
  requests: { type: ItemType; difficulty: Difficulty }[],
  levels: LevelState,
  interests: string[],
): string {
  const interestNote =
    interests.length > 0
      ? `The student's interests include: ${interests.join(', ')}. Weave these in naturally where it fits.`
      : '';

  const wordBankNote = `
- If a question's "needsWordBank" instruction says so, ALSO include a
  "wordBank" array on that question: 5-6 short candidate words or phrases
  (objects {"text": "...", "correct": true|false}), where 1-2 are marked
  correct and would properly complete the stem, and the rest are plausible
  but wrong. This is a word-bank support level between multiple choice and
  free response — the candidates should be single words or short phrases,
  not full sentences.`;

  const lines = requests.map((r, i) => {
    const typeGuide =
      r.type === 'social'
        ? `Social problem: 3-5 sentence middle school scenario where someone is left out, misunderstood, or in conflict.
   2 questions: (1) "What is the problem?" stem "The problem is that", (2) "Name 2 things [name] could do." stem "One thing [name] could do is".`
        : r.type === 'nonverbal'
        ? `Nonverbal cue: 3-4 sentences describing specific body language, facial expression, or tone of voice.
   1 question: "What does that mean?" stem "[Name] is probably"`
        : `Text inference: 4-6 sentence passage where the answer is NOT stated directly.
   1 question whose answer requires inference. Include a short stem.`;

    const needsWordBank = levels[r.type] === 2;

    return `Item ${i + 1}: type="${r.type}", difficulty=${difficultyLabel(r.difficulty)}, needsWordBank=${needsWordBank}
   ${typeGuide}`;
  });

  return `You are creating practice items for a 13-year-old with autism and a language processing disorder.
She reads well but struggles with comprehension, social reasoning, and reading nonverbal cues.

STRICT RULES:
- Scenario text: 5th–6th grade reading level
- Middle school contexts ONLY: group projects, group chats, lunch tables, hallways, siblings, sports teams
- NO playgrounds, elementary school, or young-child situations
- NO idioms, sarcasm, metaphor, or figurative language in question text or answer choices
- choices[0] is ALWAYS the correct answer (shuffled before display)
- Wrong choices must be plausible on the surface but clearly wrong on reflection
- Write NEW original scenarios — do NOT copy any example you have seen
${interestNote}
${wordBankNote}

Generate exactly ${requests.length} items as a JSON array. Each item shape:
{
  "id": "gen_<number>",
  "type": "<social|nonverbal|inference>",
  "difficulty": <1|2|3>,
  "scenario": "<scenario text>",
  "questions": [
    {
      "text": "<question text>",
      "stem": "<sentence stem without period>",
      "choices": ["<correct answer>", "<wrong choice 1>", "<wrong choice 2>"],
      "evidence": "<the exact sentence, copied verbatim from the scenario text above, that shows why the correct answer is right>",
      "wordBank": [{"text": "...", "correct": true|false}, ...]  // ONLY when needsWordBank is true for this item
    }
  ]
}

evidence MUST be an exact substring of scenario (copy it verbatim, don't paraphrase) —
it's used to check whether the student picks the right supporting sentence afterward.

${lines.join('\n\n')}

Return ONLY the raw JSON array. No markdown fences, no explanation.`;
}

function isValidWordBank(raw: unknown): boolean {
  if (!Array.isArray(raw) || raw.length < 5 || raw.length > 6) return false;
  let correctCount = 0;
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') return false;
    const e = entry as Record<string, unknown>;
    if (typeof e.text !== 'string' || e.text.trim().length === 0) return false;
    if (typeof e.correct !== 'boolean') return false;
    if (e.correct) correctCount++;
  }
  return correctCount >= 1 && correctCount <= 2;
}

function isValidItem(raw: unknown, levels: LevelState): raw is Item {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!['social', 'nonverbal', 'inference'].includes(r.type as string)) return false;
  if (![1, 2, 3].includes(r.difficulty as number)) return false;
  if (typeof r.scenario !== 'string' || r.scenario.trim().length < 30) return false;
  if (!Array.isArray(r.questions) || r.questions.length === 0) return false;

  const needsWordBank = levels[r.type as ItemType] === 2;
  const questions = r.questions as unknown[];
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (!q || typeof q !== 'object') return false;
    const qr = q as Record<string, unknown>;
    if (typeof qr.text !== 'string' || qr.text.trim().length === 0) return false;
    if (!Array.isArray(qr.choices) || qr.choices.length !== 3) return false;
    if (!qr.choices.every((c: unknown) => typeof c === 'string' && c.trim().length > 0)) return false;
    if (typeof qr.evidence !== 'string' || qr.evidence.trim().length < 8) return false;
    // Only questions[0] is ever actually rendered (Practice.tsx always uses
    // the first question; any follow-up is generated but unused) — so the
    // word-bank requirement only applies there.
    if (i === 0 && needsWordBank && !isValidWordBank(qr.wordBank)) return false;
  }
  return true;
}

// Splits `count` items across social/nonverbal/inference. If `weights` is
// provided (derived server-side from the student's own active
// student_profiles.targets, adjusted for mastery decay / floor alarms)
// counts are proportional to it; otherwise falls back to an even split.
function buildRequests(
  mode: SessionMode,
  difficulty: DifficultyState,
  count: number,
  weights?: Partial<Record<ItemType, number>>,
): { type: ItemType; difficulty: Difficulty }[] {
  if (mode !== 'mixed') {
    const diff = difficulty[mode];
    return Array.from({ length: count }, () => ({ type: mode as ItemType, difficulty: diff }));
  }

  const types: ItemType[] = ['social', 'nonverbal', 'inference'];
  const counts: Record<ItemType, number> = { social: 0, nonverbal: 0, inference: 0 };

  if (weights && types.some(t => (weights[t] ?? 0) > 0)) {
    const total = types.reduce((s, t) => s + (weights[t] ?? 0), 0);
    const raw = types.map(t => ((weights[t] ?? 0) / total) * count);
    types.forEach((t, i) => { counts[t] = Math.floor(raw[i]); });
    let remaining = count - types.reduce((s, t) => s + counts[t], 0);
    const byRemainder = types
      .map((t, i) => ({ t, frac: raw[i] - Math.floor(raw[i]) }))
      .sort((a, b) => b.frac - a.frac);
    for (let i = 0; remaining > 0; i++, remaining--) counts[byRemainder[i % types.length].t]++;
  } else {
    const perType = Math.floor(count / 3);
    const extras = count % 3;
    counts.social = perType + (extras > 0 ? 1 : 0);
    counts.nonverbal = perType + (extras > 1 ? 1 : 0);
    counts.inference = perType;
  }

  return types
    .flatMap(t => Array.from({ length: counts[t] }, () => ({ type: t, difficulty: difficulty[t] })))
    .sort(() => Math.random() - 0.5);
}

const DEFAULT_LEVELS: LevelState = { social: 3, nonverbal: 3, inference: 3 };
const DEFAULT_FLAGS = { social: false, nonverbal: false, inference: false };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      mode,
      difficulty,
      levels = DEFAULT_LEVELS,
      count,
      interests = [],
    }: {
      mode: SessionMode;
      difficulty: DifficultyState;
      levels?: LevelState;
      count: number;
      interests?: string[];
    } = req.body ?? {};

    if (!mode || !difficulty || !count) return res.status(400).json({ error: 'Missing mode, difficulty, or count' });

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const client = supabaseAsUser(token);

    const { data: diffRow } = await client
      .from('difficulty_state')
      .select('mastery, floor_alarm')
      .eq('student_id', user.id)
      .maybeSingle();
    const mastery: Record<ItemType, boolean> = diffRow?.mastery ?? DEFAULT_FLAGS;
    const floorAlarm: Record<ItemType, boolean> = diffRow?.floor_alarm ?? DEFAULT_FLAGS;

    // A floor-alarmed type is stopped entirely — even if explicitly requested.
    if (mode !== 'mixed' && floorAlarm[mode]) {
      return res.status(409).json({ error: 'floor_alarm', blockedType: mode });
    }

    // Weights come from the caller's own active profile, never the client —
    // fetched through an RLS-scoped client so a kid can only ever read their
    // own row (and a parent calling this, which shouldn't normally happen,
    // just gets no match and falls back to an even split).
    let itemTypeWeights: Record<ItemType, number> | undefined;
    if (mode === 'mixed') {
      const { data: profileRow } = await client
        .from('student_profiles')
        .select('focus')
        .eq('student_id', user.id)
        .eq('is_active', true)
        .maybeSingle();
      if (profileRow) {
        let weights = deriveItemTypeWeights(profileRow.focus as string[]);
        weights = applyMasteryToWeights(weights, mastery);
        weights = excludeFloorAlarmed(weights, floorAlarm);
        itemTypeWeights = weights;
      }
    }

    const requests = buildRequests(mode, difficulty, count, itemTypeWeights);
    const text = await groqChat([{ role: 'user', content: buildPrompt(requests, levels, interests) }], {
      temperature: 0.85,
      maxTokens: 4096,
    });

    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) throw new Error('No JSON array found in response');

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!Array.isArray(parsed)) throw new Error('Parsed value is not an array');

    const valid = (parsed as unknown[]).filter(item => isValidItem(item, levels));
    if (valid.length === 0) throw new Error('No valid items in response');

    const items = valid.slice(0, count).map((item, i) => ({ ...item, id: `gen_${Date.now()}_${i}` }));
    res.status(200).json({ items });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Item generation failed' });
  }
}
