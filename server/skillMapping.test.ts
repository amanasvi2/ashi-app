import { describe, it, expect } from 'vitest';
import { deriveItemTypeWeights, deriveInitialDifficulty } from './skillMapping';
import type { Target } from './skillMapping';

const target = (skill: string, current: number | null = null): Target => ({ skill, current, goal: null, level: null });

describe('deriveItemTypeWeights', () => {
  it('falls back to an even split when there are no targets', () => {
    const weights = deriveItemTypeWeights([]);
    expect(weights.social).toBeCloseTo(1 / 3);
    expect(weights.nonverbal).toBeCloseTo(1 / 3);
    expect(weights.inference).toBeCloseTo(1 / 3);
  });

  it('falls back to an even split when no targets are actionable', () => {
    const weights = deriveItemTypeWeights([target('spelling'), target('numerical_operations')]);
    expect(weights.social).toBeCloseTo(1 / 3);
    expect(weights.nonverbal).toBeCloseTo(1 / 3);
    expect(weights.inference).toBeCloseTo(1 / 3);
  });

  it('weights a single exact-match target entirely toward its item type', () => {
    const weights = deriveItemTypeWeights([target('nonverbal_cues')]);
    expect(weights.nonverbal).toBeCloseTo(1);
    expect(weights.social).toBeCloseTo(0);
    expect(weights.inference).toBeCloseTo(0);
  });

  it('normalizes across multiple overlapping targets and sums to 1', () => {
    const weights = deriveItemTypeWeights([
      target('identify_problem_and_solutions'), // social: 1
      target('inference_from_text'),            // inference: 1
      target('perspective_taking'),              // social: 0.6, inference: 0.2
    ]);
    const sum = weights.social + weights.nonverbal + weights.inference;
    expect(sum).toBeCloseTo(1);
    expect(weights.social).toBeGreaterThan(weights.nonverbal);
    expect(weights.inference).toBeGreaterThan(0);
  });
});

describe('deriveInitialDifficulty', () => {
  it('defaults to 1 when there is no current-accuracy data', () => {
    const diff = deriveInitialDifficulty([target('inference_from_text')]);
    expect(diff.inference).toBe(1);
  });

  it('picks difficulty 1 for low current accuracy', () => {
    const diff = deriveInitialDifficulty([target('inference_from_text', 0.2)]);
    expect(diff.inference).toBe(1);
  });

  it('picks difficulty 2 for mid-range current accuracy', () => {
    const diff = deriveInitialDifficulty([target('inference_from_text', 0.5)]);
    expect(diff.inference).toBe(2);
  });

  it('picks difficulty 3 for high current accuracy', () => {
    const diff = deriveInitialDifficulty([target('inference_from_text', 0.9)]);
    expect(diff.inference).toBe(3);
  });

  it('defaults untouched item types to 1', () => {
    const diff = deriveInitialDifficulty([target('inference_from_text', 0.9)]);
    expect(diff.social).toBe(1);
    expect(diff.nonverbal).toBe(1);
  });

  it('averages current accuracy across multiple targets touching the same item type', () => {
    // identify_problem_and_solutions -> social 1, perspective_taking -> social 0.6 + inference 0.2
    const diff = deriveInitialDifficulty([
      target('identify_problem_and_solutions', 0.9),
      target('perspective_taking', 0.1),
    ]);
    // average of 0.9 and 0.1 = 0.5 -> difficulty 2
    expect(diff.social).toBe(2);
  });
});
