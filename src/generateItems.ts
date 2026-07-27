import { groq, CONVERSATION_MODEL } from './api';
import type { Item, SessionMode, DifficultyState, Difficulty, ItemType } from './types';

function difficultyLabel(d: Difficulty): string {
  if (d === 1) return '1 (easy — answer is clear from direct context clues)';
  if (d === 2) return '2 (medium — requires connecting two or more ideas)';
  return '3 (hard — answer is implied but not obvious, needs careful reading)';
}

function buildPrompt(
  requests: { type: ItemType; difficulty: Difficulty }[],
  interests: string[],
): string {
  const interestNote =
    interests.length > 0
      ? `The student's interests include: ${interests.join(', ')}. Weave these in naturally where it fits.`
      : '';

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

    return `Item ${i + 1}: type="${r.type}", difficulty=${difficultyLabel(r.difficulty)}
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
      "choices": ["<correct answer>", "<wrong choice 1>", "<wrong choice 2>"]
    }
  ]
}

${lines.join('\n\n')}

Return ONLY the raw JSON array. No markdown fences, no explanation.`;
}

function isValidItem(raw: unknown): raw is Item {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!['social', 'nonverbal', 'inference'].includes(r.type as string)) return false;
  if (![1, 2, 3].includes(r.difficulty as number)) return false;
  if (typeof r.scenario !== 'string' || r.scenario.trim().length < 30) return false;
  if (!Array.isArray(r.questions) || r.questions.length === 0) return false;
  for (const q of r.questions as unknown[]) {
    if (!q || typeof q !== 'object') return false;
    const qr = q as Record<string, unknown>;
    if (typeof qr.text !== 'string' || qr.text.trim().length === 0) return false;
    if (!Array.isArray(qr.choices) || qr.choices.length !== 3) return false;
    if (!qr.choices.every((c: unknown) => typeof c === 'string' && c.trim().length > 0)) return false;
  }
  return true;
}

export async function generateItems(
  mode: SessionMode,
  difficulty: DifficultyState,
  count: number,
  interests: string[] = [],
): Promise<Item[]> {
  let requests: { type: ItemType; difficulty: Difficulty }[];

  if (mode === 'mixed') {
    const perType = Math.floor(count / 3);
    const extras  = count % 3;
    requests = [
      ...Array<null>(perType + (extras > 0 ? 1 : 0)).fill(null).map(() => ({ type: 'social'    as ItemType, difficulty: difficulty.social })),
      ...Array<null>(perType + (extras > 1 ? 1 : 0)).fill(null).map(() => ({ type: 'nonverbal' as ItemType, difficulty: difficulty.nonverbal })),
      ...Array<null>(perType).fill(null).map(()                        => ({ type: 'inference'  as ItemType, difficulty: difficulty.inference })),
    ].sort(() => Math.random() - 0.5);
  } else {
    const diff = difficulty[mode];
    requests = Array<null>(count).fill(null).map(() => ({ type: mode as ItemType, difficulty: diff }));
  }

  const response = await groq.chat.completions.create({
    model: CONVERSATION_MODEL,
    messages: [{ role: 'user', content: buildPrompt(requests, interests) }],
    temperature: 0.85,
    max_tokens: 4096,
  });

  const text = response.choices[0]?.message?.content ?? '';

  // Extract the JSON array even if the model wraps it in markdown fences
  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) throw new Error('No JSON array found in response');

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) throw new Error('Parsed value is not an array');

  const valid = (parsed as unknown[]).filter(isValidItem);
  if (valid.length === 0) throw new Error('No valid items in response');

  return valid.slice(0, count).map((item, i) => ({
    ...item,
    id: `gen_${Date.now()}_${i}`,
  }));
}
