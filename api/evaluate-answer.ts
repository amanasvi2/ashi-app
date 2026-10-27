import {languagePrompt,type LanguageProfile} from '../src/language/wording.js';
import {supabaseAsUser} from '../server/asUser.js';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { groqChat } from '../server/groq.js';

export interface EvaluationResult {
  result: 'correct' | 'partial' | 'incorrect';
  feedback: string;
}

export function buildPrompt(scenario: string, questionText: string, correctAnswer: string, userAnswer: string,profile?:LanguageProfile): string {
  return `You are evaluating a student's typed answer to a reading comprehension / social
reasoning question.
${languagePrompt(profile)}
There are many valid ways to correctly answer — judge for MEANING, not exact wording.

Scenario:
"""
${scenario}
"""

Question: "${questionText}"
One example of a fully correct answer: "${correctAnswer}"
Student's answer: "${userAnswer}"

Decide:
- "correct": the answer shows understanding of the key idea, even if phrased very
  differently from the example.
- "partial": shows some understanding but is incomplete or missing something important.
- "incorrect": does not show understanding of the key idea.

Return ONLY a raw JSON object, no markdown fences, no explanation:
{"result": "correct" | "partial" | "incorrect", "feedback": "<one short sentence, plain literal language, no idioms or sarcasm, encouraging tone>"}`;
}

export function isValidResult(raw: unknown): raw is EvaluationResult {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!['correct', 'partial', 'incorrect'].includes(r.result as string)) return false;
  if (typeof r.feedback !== 'string' || r.feedback.trim().length === 0) return false;
  return true;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const {
      scenario, questionText, correctAnswer, userAnswer,
    }: { scenario?: string; questionText?: string; correctAnswer?: string; userAnswer?: string } = req.body ?? {};

    if (!scenario || !questionText || !correctAnswer || !userAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const client=supabaseAsUser(String(req.headers.authorization).replace(/^Bearer\s+/i,''));
    const {data:profile,error:profileError}=await client.from('student_profiles').select('grade,reading_level,supports').eq('student_id',user.id).eq('is_active',true).maybeSingle();
    if(profileError)return res.status(503).json({error:'Student profile could not be loaded.'});
    const text = await groqChat(
      [{ role: 'user', content: buildPrompt(scenario, questionText, correctAnswer, userAnswer,profile) }],
      { temperature: 0.3, maxTokens: 200 },
    );

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON object found in response');

    const parsed: unknown = JSON.parse(jsonMatch[0]);
    if (!isValidResult(parsed)) throw new Error('Malformed evaluation result');

    res.status(200).json(parsed);
  } catch (err) {
    // Any failure here (unreachable, malformed output) should make the
    // client fall back to its local heuristic rather than get a fake
    // verdict — so this is always a non-2xx, never a best-effort 200.
    console.error(err);
    res.status(502).json({ error: 'Evaluation failed' });
  }
}
