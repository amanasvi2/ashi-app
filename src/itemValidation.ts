import type { Item, LevelState, Difficulty, ItemType } from './types';

export function isValidWordBank(raw: unknown): boolean {
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

export function isValidItem(
  raw: unknown,
  levels: LevelState,
  expectedDifficulty: Partial<Record<ItemType, Difficulty>>,
): raw is Item {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as Record<string, unknown>;
  if (!['social', 'nonverbal', 'inference'].includes(r.type as string)) return false;
  if (![1, 2, 3].includes(r.difficulty as number)) return false;
  // The model is asked for a specific difficulty per type but sometimes
  // self-labels a different one — reject rather than trust the label, since
  // the adaptive engine's difficulty gating depends on served items actually
  // matching what was requested.
  if (r.difficulty !== expectedDifficulty[r.type as ItemType]) return false;
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
    if (typeof qr.evidence !== 'string' || qr.evidence.trim().length < 8 || !r.scenario.includes(qr.evidence)) return false;
    if (new Set((qr.choices as string[]).map(c => c.trim().toLowerCase())).size !== 3) return false;
    // Only questions[0] is ever actually rendered (Practice.tsx always uses
    // the first question; any follow-up is generated but unused) — so the
    // word-bank requirement only applies there.
    if (i === 0 && needsWordBank) {
      if (typeof qr.stem !== 'string' || !qr.stem.trim() || !isValidWordBank(qr.wordBank)) return false;
      const bank = qr.wordBank as {text:string}[];
      if (new Set(bank.map(w => w.text.trim().toLowerCase())).size !== bank.length) return false;
    }
  }
  return true;
}

