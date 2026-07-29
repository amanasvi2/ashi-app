import type { ItemType } from '../src/types';
import { isActionableFocusSkill, type ActionableFocusSkillId } from '../src/skills.js';

const ITEM_TYPES: ItemType[] = ['social', 'nonverbal', 'inference'];

// Only the actionable subset of skills.ts contributes weight — a focus
// skill outside this set is still stored and shown (flagged) on the
// confirm screen, but doesn't influence what the generator produces.
const SKILL_ITEM_TYPE_WEIGHTS: Record<ActionableFocusSkillId, Partial<Record<ItemType, number>>> = {
  identify_problem_and_solutions: { social: 1 },
  perspective_taking: { social: 0.6, inference: 0.2 },
  nonverbal_cues: { nonverbal: 1 },
  inference_from_text: { inference: 1 },
  main_idea_summarizing: { inference: 0.6 },
  nonliteral_language: { inference: 0.6 },
};

// Difficulty is not derived from the profile at all — it's left entirely
// to the adaptive engine (src/adaptiveEngine.ts), starting from the app's
// original hardcoded default for every new student. Mastery-decay and
// floor-alarm adjustments to these base weights are applied by the caller
// (api/items/generate.ts), not here.
export function deriveItemTypeWeights(focus: string[]): Record<ItemType, number> {
  const totals: Record<ItemType, number> = { social: 0, nonverbal: 0, inference: 0 };

  for (const skill of focus) {
    if (!isActionableFocusSkill(skill)) continue;
    const contribution = SKILL_ITEM_TYPE_WEIGHTS[skill];
    for (const type of ITEM_TYPES) totals[type] += contribution[type] ?? 0;
  }

  const sum = ITEM_TYPES.reduce((s, type) => s + totals[type], 0);
  if (sum === 0) return { social: 1 / 3, nonverbal: 1 / 3, inference: 1 / 3 };

  const weights = {} as Record<ItemType, number>;
  for (const type of ITEM_TYPES) weights[type] = totals[type] / sum;
  return weights;
}
