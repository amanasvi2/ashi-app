import { isValidItem } from '../itemValidation.js';
import { SKILL_TYPES, type CarryoverSkill } from './model.js';
import type { Item, LevelState, DifficultyState } from '../types';

export function validatedBatch(raw: unknown, skill: CarryoverSkill, levels: LevelState, difficulty: DifficultyState): Item[] {
  if (!Array.isArray(raw) || raw.length < 3 || raw.length > 5) throw new Error('Expected 3–5 practice items.');
  return raw.map(value => validateEditedItem(value, skill, levels, difficulty));
}
export function validateEditedItem(raw: unknown, skill: CarryoverSkill, levels: LevelState, difficulty: DifficultyState): Item {
  const type = SKILL_TYPES[skill];
  if (!isValidItem(raw, levels, { [type]: difficulty[type] }) || raw.type !== type || raw.questions.length !== 1) throw new Error('Item format or support level did not match.');
  for (const q of raw.questions) {
    if (!q.evidence || !raw.scenario.includes(q.evidence)) throw new Error('Evidence must occur exactly in the scenario.');
    if (new Set(q.choices?.map(c => c.trim().toLowerCase())).size !== 3) throw new Error('Answer choices must differ.');
    if (levels[type] > 0 && !q.stem?.trim()) throw new Error('Supported items need a sentence stem.');
    if (levels[type] === 2 && new Set(q.wordBank?.map(w => w.text.trim().toLowerCase())).size !== q.wordBank?.length) throw new Error('Word-bank choices must differ.');
  }
  // Project onto the supported schema: model-generated extra fields never
  // become stored instructions or trusted review metadata.
  return { id: 'candidate', type: raw.type, difficulty: raw.difficulty, scenario: raw.scenario,
    questions: raw.questions.map(q => ({ text: q.text, stem: q.stem, choices: q.choices, evidence: q.evidence,
      wordBank: q.wordBank?.map(w => ({ text: w.text, correct: w.correct })) })) };
}
