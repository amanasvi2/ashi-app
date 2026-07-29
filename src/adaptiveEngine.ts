import type {
  ItemType, SupportLevel, Difficulty, AnswerResult, LevelState, StreakState,
} from './types';

const ITEM_TYPES: ItemType[] = ['social', 'nonverbal', 'inference'];
const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

const clampLevel = (n: number): SupportLevel => Math.max(0, Math.min(3, n)) as SupportLevel;
const clampDiff  = (n: number): Difficulty   => Math.max(1, Math.min(3, n)) as Difficulty;
const isCorrect  = (r: AnswerResult) => r === 'correct' || r === 'partial';

// ── Support level state (queued, applied only at session start) ─────────────

export type PendingLevels = Record<ItemType, SupportLevel | null>;

export interface LevelSlice {
  levels: LevelState;
  streaks: StreakState;
  pending: PendingLevels;
}

export interface PersistedLevelState extends LevelSlice {
  lastSessionAt: string | null; // ISO timestamp, matches the DB column
}

const emptyStreaks = (): StreakState => ({
  social:    { correct: 0, incorrect: 0 },
  nonverbal: { correct: 0, incorrect: 0 },
  inference: { correct: 0, incorrect: 0 },
});

const emptyPending = (): PendingLevels => ({ social: null, nonverbal: null, inference: null });

export const initialLevelState: LevelSlice = {
  levels: { social: 3, nonverbal: 3, inference: 3 },
  streaks: emptyStreaks(),
  pending: emptyPending(),
};

export const initialPersistedLevelState: PersistedLevelState = {
  ...initialLevelState,
  lastSessionAt: null,
};

// Per-answer: streaks always update; a level change is queued (not applied)
// so the answer format never changes mid-session. Computed relative to the
// session-start (frozen) level every time, so at most one step is ever
// queued per session even across multiple streak completions.
export function nextLevelState(state: LevelSlice, itemType: ItemType, result: AnswerResult): LevelSlice {
  const prevLevel = state.levels[itemType];
  const prevStreak = state.streaks[itemType];

  let correct = isCorrect(result) ? prevStreak.correct + 1 : 0;
  let incorrect = !isCorrect(result) ? prevStreak.incorrect + 1 : 0;
  let queuedLevel = state.pending[itemType];

  if (correct >= 3) {
    queuedLevel = clampLevel(prevLevel - 1);
    correct = 0; incorrect = 0;
  }
  if (incorrect >= 2) {
    queuedLevel = clampLevel(prevLevel + 1);
    correct = 0; incorrect = 0;
  }

  return {
    ...state,
    streaks: { ...state.streaks, [itemType]: { correct, incorrect } },
    pending: { ...state.pending, [itemType]: queuedLevel },
  };
}

// Thin action-dispatch wrapper so Practice.tsx can keep using React's
// useReducer exactly as before.
export type LevelAction = { type: 'RECORD'; itemType: ItemType; result: AnswerResult };

export function levelReducer(state: LevelSlice, action: LevelAction): LevelSlice {
  if (action.type !== 'RECORD') return state;
  return nextLevelState(state, action.itemType, action.result);
}

// Runs once when a session begins: applies a 14-day gap re-entry (steps
// every type up one level, resets streaks, discards any pending change —
// a long gap overrides whatever was queued) or, absent a gap, applies any
// queued pending change from the last session and clears it.
export function resolveSessionStart(state: PersistedLevelState, now: Date): PersistedLevelState {
  const lastMs = state.lastSessionAt ? new Date(state.lastSessionAt).getTime() : null;
  const isGap = lastMs !== null && now.getTime() - lastMs >= FOURTEEN_DAYS_MS;

  if (isGap) {
    const levels = {} as LevelState;
    for (const t of ITEM_TYPES) levels[t] = clampLevel(state.levels[t] + 1);
    return { levels, streaks: emptyStreaks(), pending: emptyPending(), lastSessionAt: now.toISOString() };
  }

  const levels = { ...state.levels };
  for (const t of ITEM_TYPES) {
    const p = state.pending[t];
    if (p !== null) levels[t] = p;
  }
  return { levels, streaks: state.streaks, pending: emptyPending(), lastSessionAt: now.toISOString() };
}

// ── Chance-corrected rolling accuracy ────────────────────────────────────────

// k = option count at the time of that attempt: 3 at support level 3 (MC),
// the word-bank length at level 2, null at levels 1/0 (free text — no
// correction, since production isn't guessable the way selection is).
export function adjustForChance(raw: number, k: number | null): number {
  if (k === null || k <= 1) return raw;
  return Math.max(0, (raw - 1 / k) / (1 - 1 / k));
}

export interface Attempt {
  result: AnswerResult;
  optionCount: number | null;
}

function rawScore(result: AnswerResult): number {
  if (result === 'correct') return 1;
  if (result === 'partial') return 0.5;
  return 0;
}

// `attempts` should already be capped to the window size (last 10) by the
// caller's query — this only enforces the separate minimum-count gate
// (8 for difficulty, 10 for mastery/floor-alarm) and returns null (meaning
// "no change / not enough data") below it, exactly like a short window.
export function rollingAdjusted(attempts: Attempt[], minCount: number): number | null {
  if (attempts.length < minCount) return null;
  const sum = attempts.reduce((s, a) => s + adjustForChance(rawScore(a.result), a.optionCount), 0);
  return sum / attempts.length;
}

// ── Difficulty (gated by support level), mastery decay, floor alarm ─────────

// Difficulty may only increase while support level is <= 1 (free-text
// production) — acing multiple-choice/word-bank recognition shouldn't be
// mistaken for mastery that warrants harder content. Decreases are ungated.
export function nextDifficulty(prev: Difficulty, rolling: number | null, supportLevel: SupportLevel): Difficulty {
  if (rolling === null) return prev;
  if (rolling >= 0.85 && supportLevel <= 1) return clampDiff(prev + 1);
  if (rolling < 0.65) return clampDiff(prev - 1);
  return prev;
}

// Hysteresis: sets at the top (support 0, difficulty 3, rolling >= 0.85),
// clears below 0.70, otherwise holds.
export function nextMastery(prevFlag: boolean, supportLevel: SupportLevel, difficulty: Difficulty, rolling: number | null): boolean {
  if (rolling === null) return prevFlag;
  if (supportLevel === 0 && difficulty === 3 && rolling >= 0.85) return true;
  if (rolling < 0.70) return false;
  return prevFlag;
}

// Maximum support AND easiest content AND still failing — the adaptive
// knobs have nothing left to offer. Stop serving new items of this type.
export function isFloorAlarm(supportLevel: SupportLevel, difficulty: Difficulty, rolling: number | null): boolean {
  if (rolling === null) return false;
  return supportLevel === 3 && difficulty === 1 && rolling < 0.50;
}

// ── Item-type mix adjustments (applied on top of the profile-derived base weights) ──

// A mastered type is "maintenance" — never zero, but pinned to 10% so the
// freed-up practice time goes to the other focus types.
export function applyMasteryToWeights(
  weights: Record<ItemType, number>,
  mastery: Record<ItemType, boolean>,
): Record<ItemType, number> {
  const masteredTypes = ITEM_TYPES.filter(t => mastery[t]);
  const activeTypes = ITEM_TYPES.filter(t => !mastery[t]);
  if (masteredTypes.length === 0 || activeTypes.length === 0) return weights;

  const MAINTENANCE = 0.10;
  const remaining = 1 - MAINTENANCE * masteredTypes.length;
  const activeBaseTotal = activeTypes.reduce((s, t) => s + weights[t], 0);

  const result = {} as Record<ItemType, number>;
  for (const t of masteredTypes) result[t] = MAINTENANCE;
  for (const t of activeTypes) {
    result[t] = activeBaseTotal > 0 ? remaining * (weights[t] / activeBaseTotal) : remaining / activeTypes.length;
  }
  return result;
}

// A floor-alarmed type is excluded entirely — no new items of it are served.
export function excludeFloorAlarmed(
  weights: Record<ItemType, number>,
  floorAlarm: Record<ItemType, boolean>,
): Record<ItemType, number> {
  const alarmedTypes = ITEM_TYPES.filter(t => floorAlarm[t]);
  const activeTypes = ITEM_TYPES.filter(t => !floorAlarm[t]);
  if (alarmedTypes.length === 0 || activeTypes.length === 0) return weights;

  const activeBaseTotal = activeTypes.reduce((s, t) => s + weights[t], 0);
  const result = {} as Record<ItemType, number>;
  for (const t of alarmedTypes) result[t] = 0;
  for (const t of activeTypes) {
    result[t] = activeBaseTotal > 0 ? weights[t] / activeBaseTotal : 1 / activeTypes.length;
  }
  return result;
}
