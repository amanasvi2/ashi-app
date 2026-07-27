import type { ItemType, LevelState, StreakState, SupportLevel, AnswerResult } from './types';

export interface LevelSlice {
  levels: LevelState;
  streaks: StreakState;
}

export type LevelAction =
  | { type: 'RECORD'; itemType: ItemType; result: AnswerResult };

const clamp = (n: number): SupportLevel =>
  (Math.max(0, Math.min(2, n)) as SupportLevel);

// Correct = 'correct' or 'partial'. Incorrect = 'incorrect'.
const isCorrect = (r: AnswerResult) => r === 'correct' || r === 'partial';

export const initialLevelState: LevelSlice = {
  levels: { social: 2, nonverbal: 2, inference: 2 },
  streaks: {
    social:    { correct: 0, incorrect: 0 },
    nonverbal: { correct: 0, incorrect: 0 },
    inference: { correct: 0, incorrect: 0 },
  },
};

export function levelReducer(state: LevelSlice, action: LevelAction): LevelSlice {
  if (action.type !== 'RECORD') return state;

  const { itemType, result } = action;
  const prevLevel = state.levels[itemType];
  const prevStreak = state.streaks[itemType];

  let correct = isCorrect(result) ? prevStreak.correct + 1 : 0;
  let incorrect = !isCorrect(result) ? prevStreak.incorrect + 1 : 0;

  let nextLevel = prevLevel;

  // Advance one level (lower number = less support) after 3 consecutive correct
  if (correct >= 3) {
    nextLevel = clamp(prevLevel - 1);
    correct = 0;
    incorrect = 0;
  }

  // Drop one level after 2 consecutive incorrect
  if (incorrect >= 2) {
    nextLevel = clamp(prevLevel + 1);
    correct = 0;
    incorrect = 0;
  }

  return {
    levels: { ...state.levels, [itemType]: nextLevel },
    streaks: {
      ...state.streaks,
      [itemType]: { correct, incorrect },
    },
  };
}
