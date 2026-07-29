import { describe, it, expect } from 'vitest';
import { deriveItemTypeWeights } from './skillMapping';

describe('deriveItemTypeWeights', () => {
  it('falls back to an even split when there is no focus', () => {
    const weights = deriveItemTypeWeights([]);
    expect(weights.social).toBeCloseTo(1 / 3);
    expect(weights.nonverbal).toBeCloseTo(1 / 3);
    expect(weights.inference).toBeCloseTo(1 / 3);
  });

  it('falls back to an even split when no focus skills are actionable', () => {
    const weights = deriveItemTypeWeights(['spelling', 'numerical_operations']);
    expect(weights.social).toBeCloseTo(1 / 3);
    expect(weights.nonverbal).toBeCloseTo(1 / 3);
    expect(weights.inference).toBeCloseTo(1 / 3);
  });

  it('ignores non-actionable focus skills mixed in with actionable ones', () => {
    const weights = deriveItemTypeWeights(['numerical_operations', 'nonverbal_cues']);
    expect(weights.nonverbal).toBeCloseTo(1);
  });

  it('weights a single exact-match focus skill entirely toward its item type', () => {
    const weights = deriveItemTypeWeights(['nonverbal_cues']);
    expect(weights.nonverbal).toBeCloseTo(1);
    expect(weights.social).toBeCloseTo(0);
    expect(weights.inference).toBeCloseTo(0);
  });

  it('normalizes across multiple overlapping focus skills and sums to 1', () => {
    const weights = deriveItemTypeWeights([
      'identify_problem_and_solutions', // social: 1
      'inference_from_text',            // inference: 1
      'perspective_taking',             // social: 0.6, inference: 0.2
    ]);
    const sum = weights.social + weights.nonverbal + weights.inference;
    expect(sum).toBeCloseTo(1);
    expect(weights.social).toBeGreaterThan(weights.nonverbal);
    expect(weights.inference).toBeGreaterThan(0);
  });
});
