import type { ItemType } from '../src/types';
import { isActionableTargetSkill, type ActionableTargetSkillId } from '../src/skills';

export interface Target {
  skill: string;
  current: number | null;
  goal: number | null;
  level: number | null;
}

const ITEM_TYPES: ItemType[] = ['social', 'nonverbal', 'inference'];

// Only the actionable subset of skills.ts contributes weight — everything
// else (strengths, or targets outside this set) is stored but doesn't
// influence what the generator produces. See skills.ts for why.
const SKILL_ITEM_TYPE_WEIGHTS: Record<ActionableTargetSkillId, Partial<Record<ItemType, number>>> = {
  identify_problem_and_solutions: { social: 1 },
  perspective_taking: { social: 0.6, inference: 0.2 },
  nonverbal_cues: { nonverbal: 1 },
  inference_from_text: { inference: 1 },
  main_idea_summarizing: { inference: 0.6 },
  nonliteral_language: { inference: 0.6 },
};

export function deriveItemTypeWeights(targets: Target[]): Record<ItemType, number> {
  const totals: Record<ItemType, number> = { social: 0, nonverbal: 0, inference: 0 };

  for (const t of targets) {
    if (!isActionableTargetSkill(t.skill)) continue;
    const contribution = SKILL_ITEM_TYPE_WEIGHTS[t.skill];
    for (const type of ITEM_TYPES) totals[type] += contribution[type] ?? 0;
  }

  const sum = ITEM_TYPES.reduce((s, type) => s + totals[type], 0);
  if (sum === 0) return { social: 1 / 3, nonverbal: 1 / 3, inference: 1 / 3 };

  const weights = {} as Record<ItemType, number>;
  for (const type of ITEM_TYPES) weights[type] = totals[type] / sum;
  return weights;
}

// current accuracy < 0.4 -> difficulty 1, 0.4-0.7 -> 2, > 0.7 -> 3.
// No matching target data for a type -> difficulty 1 (today's default).
export function deriveInitialDifficulty(targets: Target[]): Record<ItemType, 1 | 2 | 3> {
  const sums: Record<ItemType, { total: number; count: number }> = {
    social: { total: 0, count: 0 },
    nonverbal: { total: 0, count: 0 },
    inference: { total: 0, count: 0 },
  };

  for (const t of targets) {
    if (t.current === null || t.current === undefined) continue;
    if (!isActionableTargetSkill(t.skill)) continue;
    const contribution = SKILL_ITEM_TYPE_WEIGHTS[t.skill];
    for (const type of ITEM_TYPES) {
      if (contribution[type]) {
        sums[type].total += t.current;
        sums[type].count += 1;
      }
    }
  }

  const result = {} as Record<ItemType, 1 | 2 | 3>;
  for (const type of ITEM_TYPES) {
    const { total, count } = sums[type];
    if (count === 0) { result[type] = 1; continue; }
    const avg = total / count;
    result[type] = avg < 0.4 ? 1 : avg <= 0.7 ? 2 : 3;
  }
  return result;
}
