import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../../server/verifyUser';
import { groqChat } from '../../server/groq';

interface TailoringDraft {
  goalsSummary: string[];
  itemTypeWeights: { social: number; nonverbal: number; inference: number };
  initialDifficulty: { social: 1 | 2 | 3; nonverbal: 1 | 2 | 3; inference: 1 | 2 | 3 };
  parentExplanation: string;
}

const PROMPT_HEADER = `You are helping configure a practice app for a middle-schooler with an IEP
(Individualized Education Program). The app has three practice item types:

- "social": short scenarios about peer conflict, being left out, or misunderstandings —
  practices identifying the social problem and generating solutions.
- "nonverbal": scenarios describing body language, facial expression, or tone of voice —
  practices reading nonverbal social cues.
- "inference": short reading passages where the answer is not stated directly —
  practices reading comprehension and inference.

Read the IEP text below (goals, present levels of performance, accommodations) and decide:
1. goalsSummary: 2-4 short, plain-language bullet points (a parent should understand them,
   NOT clinical jargon) describing the relevant goals this app can support. Do not invent
   goals that aren't in the document.
2. itemTypeWeights: relative emphasis for social/nonverbal/inference as three numbers that
   sum to 1, based on which goal areas the IEP emphasizes (e.g. heavy pragmatic-language or
   social-skills goals -> weight "social" and "nonverbal" higher; heavy reading-comprehension
   goals -> weight "inference" higher). If a goal area isn't addressed at all, still give it
   some non-zero weight (minimum 0.15) so all three item types keep appearing.
3. initialDifficulty: a starting difficulty (1 easy, 2 medium, 3 hard) per item type, based on
   the student's documented present levels of performance in that area. Default to 1 if unclear.
4. parentExplanation: one short paragraph (3-4 sentences, plain language) explaining to the
   parent how this app's practice will support their child's specific goals.

Return ONLY raw JSON matching this shape, no markdown fences, no explanation outside the JSON:
{
  "goalsSummary": ["...", "..."],
  "itemTypeWeights": { "social": 0.0, "nonverbal": 0.0, "inference": 0.0 },
  "initialDifficulty": { "social": 1, "nonverbal": 1, "inference": 1 },
  "parentExplanation": "..."
}

IEP text:
"""`;

function isValidDraft(raw: unknown): raw is TailoringDraft {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.goalsSummary) || r.goalsSummary.length === 0) return false;
  if (!r.itemTypeWeights || typeof r.itemTypeWeights !== 'object') return false;
  if (!r.initialDifficulty || typeof r.initialDifficulty !== 'object') return false;
  if (typeof r.parentExplanation !== 'string' || r.parentExplanation.trim().length === 0) return false;
  const weights = r.itemTypeWeights as Record<string, unknown>;
  const diff = r.initialDifficulty as Record<string, unknown>;
  for (const key of ['social', 'nonverbal', 'inference']) {
    if (typeof weights[key] !== 'number') return false;
    if (![1, 2, 3].includes(diff[key] as number)) return false;
  }
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const parent = await verifyUser(req.headers.authorization);
  if (!parent) return res.status(401).json({ error: 'Unauthorized' });

  const { extractedText }: { extractedText?: string } = req.body ?? {};
  if (!extractedText || extractedText.trim().length < 50) {
    return res.status(400).json({ error: 'IEP text is too short to analyze' });
  }

  try {
    const prompt = `${PROMPT_HEADER}${extractedText.slice(0, 12000)}\n"""`;
    const text = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.4, maxTokens: 1024 });

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!isValidDraft(parsed)) throw new Error('Malformed tailoring draft');

    res.status(200).json({ draft: parsed });
  } catch (err) {
    console.error(err);
    res.status(502).json({ error: 'IEP analysis failed' });
  }
}
