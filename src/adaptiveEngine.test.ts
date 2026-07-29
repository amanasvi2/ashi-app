import { describe, it, expect } from 'vitest';
import {
  adjustForChance, rollingAdjusted, nextLevelState, resolveSessionStart,
  nextDifficulty, nextMastery, isFloorAlarm, applyMasteryToWeights, excludeFloorAlarmed,
  initialLevelState, initialPersistedLevelState,
} from './adaptiveEngine';
import type { Attempt, LevelSlice, PersistedLevelState } from './adaptiveEngine';

describe('adjustForChance', () => {
  it('corrects a k=3 (multiple choice) score for guessing', () => {
    // raw 1.0 at k=3: (1 - 1/3) / (1 - 1/3) = 1
    expect(adjustForChance(1, 3)).toBeCloseTo(1);
    // raw 1/3 (chance level) at k=3 nets to 0
    expect(adjustForChance(1 / 3, 3)).toBeCloseTo(0);
    // raw 0 at k=3 would go negative, clamped to 0
    expect(adjustForChance(0, 3)).toBe(0);
  });

  it('does not adjust free-text levels (k=null)', () => {
    expect(adjustForChance(0.7, null)).toBe(0.7);
    expect(adjustForChance(1, null)).toBe(1);
  });
});

describe('rollingAdjusted', () => {
  const attempt = (result: Attempt['result'], k: Attempt['optionCount']): Attempt => ({ result, optionCount: k });

  it('returns null (no change) when the window is short', () => {
    const attempts = Array.from({ length: 7 }, () => attempt('correct', 3));
    expect(rollingAdjusted(attempts, 8)).toBeNull();
  });

  it('computes an average once the minimum count is met', () => {
    const attempts = Array.from({ length: 8 }, () => attempt('correct', 3));
    expect(rollingAdjusted(attempts, 8)).toBeCloseTo(1);
  });

  it('mixes free-text (no adjustment) and MC (chance-adjusted) attempts correctly', () => {
    const attempts = [
      ...Array.from({ length: 5 }, () => attempt('correct', null)), // 1.0 each, no adjustment
      ...Array.from({ length: 5 }, () => attempt('correct', 3)),    // 1.0 each after adjustment too
    ];
    expect(rollingAdjusted(attempts, 8)).toBeCloseTo(1);
  });
});

describe('nextDifficulty (gated by support level)', () => {
  it('blocks a difficulty increase at support level 3 even with a high rolling score', () => {
    expect(nextDifficulty(1, 0.9, 3)).toBe(1);
  });

  it('allows a difficulty increase at support level 1 with a high rolling score', () => {
    expect(nextDifficulty(1, 0.9, 1)).toBe(2);
  });

  it('allows a difficulty decrease regardless of support level', () => {
    expect(nextDifficulty(3, 0.5, 3)).toBe(2);
  });

  it('does not change difficulty when rolling is null (short window)', () => {
    expect(nextDifficulty(2, null, 0)).toBe(2);
  });

  it('holds difficulty in the dead zone between thresholds', () => {
    expect(nextDifficulty(2, 0.7, 0)).toBe(2);
  });

  it('clamps at the difficulty ceiling and floor', () => {
    expect(nextDifficulty(3, 0.9, 0)).toBe(3);
    expect(nextDifficulty(1, 0.5, 0)).toBe(1);
  });
});

describe('nextLevelState / resolveSessionStart (queued at session boundary)', () => {
  it('queues a level change on 3-correct-in-a-row but leaves levels untouched mid-session', () => {
    let state: LevelSlice = initialLevelState; // social starts at 3
    state = nextLevelState(state, 'social', 'correct');
    state = nextLevelState(state, 'social', 'correct');
    state = nextLevelState(state, 'social', 'correct');
    expect(state.levels.social).toBe(3); // not applied yet — this is the key guarantee
    expect(state.pending.social).toBe(2); // queued
  });

  it('queues a level increase on 2-incorrect-in-a-row, also not applied mid-session', () => {
    let state: LevelSlice = { ...initialLevelState, levels: { social: 1, nonverbal: 3, inference: 3 } };
    state = nextLevelState(state, 'social', 'incorrect');
    state = nextLevelState(state, 'social', 'incorrect');
    expect(state.levels.social).toBe(1);
    expect(state.pending.social).toBe(2);
  });

  it('applies a queued change only when a new session starts', () => {
    let state: LevelSlice = initialLevelState;
    state = nextLevelState(state, 'social', 'correct');
    state = nextLevelState(state, 'social', 'correct');
    state = nextLevelState(state, 'social', 'correct');
    const persisted: PersistedLevelState = { ...state, lastSessionAt: new Date().toISOString() };
    const resolved = resolveSessionStart(persisted, new Date());
    expect(resolved.levels.social).toBe(2); // now applied
    expect(resolved.pending.social).toBeNull(); // consumed
  });

  it('does nothing on session start when nothing is queued', () => {
    const resolved = resolveSessionStart(initialPersistedLevelState, new Date());
    expect(resolved.levels).toEqual(initialLevelState.levels);
  });
});

describe('resolveSessionStart (14-day gap re-entry)', () => {
  it('steps every type up one level and clears streaks/pending after a 14+ day gap', () => {
    const fifteenDaysAgo = new Date(Date.now() - 15 * 24 * 60 * 60 * 1000);
    const state: PersistedLevelState = {
      levels: { social: 1, nonverbal: 0, inference: 2 },
      streaks: { social: { correct: 2, incorrect: 0 }, nonverbal: { correct: 0, incorrect: 1 }, inference: { correct: 1, incorrect: 0 } },
      pending: { social: 0, nonverbal: null, inference: null }, // a pending decrease that should be discarded
      lastSessionAt: fifteenDaysAgo.toISOString(),
    };
    const resolved = resolveSessionStart(state, new Date());
    expect(resolved.levels).toEqual({ social: 2, nonverbal: 1, inference: 3 });
    expect(resolved.streaks.social).toEqual({ correct: 0, incorrect: 0 });
    expect(resolved.pending.social).toBeNull(); // discarded, not applied
  });

  it('does not trigger the gap re-entry just under 14 days', () => {
    const thirteenDaysAgo = new Date(Date.now() - 13 * 24 * 60 * 60 * 1000);
    const state: PersistedLevelState = { ...initialPersistedLevelState, lastSessionAt: thirteenDaysAgo.toISOString() };
    const resolved = resolveSessionStart(state, new Date());
    expect(resolved.levels).toEqual(initialLevelState.levels);
  });
});

describe('nextMastery (sets and clears)', () => {
  it('sets mastery at support 0 + difficulty 3 + rolling >= 0.85', () => {
    expect(nextMastery(false, 0, 3, 0.9)).toBe(true);
  });

  it('does not set mastery if support level or difficulty is not at the ceiling', () => {
    expect(nextMastery(false, 1, 3, 0.9)).toBe(false);
    expect(nextMastery(false, 0, 2, 0.9)).toBe(false);
  });

  it('clears mastery once rolling drops below 0.70', () => {
    expect(nextMastery(true, 0, 3, 0.65)).toBe(false);
  });

  it('holds the flag steady between the clear and set thresholds', () => {
    expect(nextMastery(true, 0, 3, 0.75)).toBe(true);
    expect(nextMastery(false, 0, 3, 0.75)).toBe(false);
  });
});

describe('isFloorAlarm', () => {
  it('fires at support 3 + difficulty 1 + rolling < 0.50', () => {
    expect(isFloorAlarm(3, 1, 0.4)).toBe(true);
  });

  it('does not fire above the accuracy threshold', () => {
    expect(isFloorAlarm(3, 1, 0.5)).toBe(false);
  });

  it('does not fire away from the support/difficulty floor', () => {
    expect(isFloorAlarm(2, 1, 0.3)).toBe(false);
    expect(isFloorAlarm(3, 2, 0.3)).toBe(false);
  });

  it('does not fire with too little data', () => {
    expect(isFloorAlarm(3, 1, null)).toBe(false);
  });
});

describe('applyMasteryToWeights', () => {
  it('pins a mastered type to 10% and redistributes the rest proportionally', () => {
    const weights = { social: 0.5, nonverbal: 0.3, inference: 0.2 };
    const result = applyMasteryToWeights(weights, { social: true, nonverbal: false, inference: false });
    expect(result.social).toBeCloseTo(0.10);
    expect(result.nonverbal + result.inference).toBeCloseTo(0.90);
    expect(result.nonverbal / result.inference).toBeCloseTo(0.3 / 0.2);
  });

  it('is a no-op when nothing is mastered', () => {
    const weights = { social: 0.5, nonverbal: 0.3, inference: 0.2 };
    expect(applyMasteryToWeights(weights, { social: false, nonverbal: false, inference: false })).toEqual(weights);
  });
});

describe('excludeFloorAlarmed', () => {
  it('zeroes the alarmed type and redistributes the rest', () => {
    const weights = { social: 0.5, nonverbal: 0.3, inference: 0.2 };
    const result = excludeFloorAlarmed(weights, { social: false, nonverbal: true, inference: false });
    expect(result.nonverbal).toBe(0);
    expect(result.social + result.inference).toBeCloseTo(1);
  });
});
