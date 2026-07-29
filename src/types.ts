export type ItemType = 'social' | 'nonverbal' | 'inference';
export type SessionMode = 'mixed' | 'social' | 'nonverbal' | 'inference';
export type SupportLevel = 0 | 1 | 2;
export type Difficulty = 1 | 2 | 3;

export interface Question {
  text: string;
  stem?: string;
  choices?: [string, string, string];
  evidence?: string;   // the exact sentence from the scenario that supports the answer
}

export interface Item {
  id: string;
  type: ItemType;
  difficulty: Difficulty;
  scenario: string;
  questions: Question[];
}

export interface LevelState {
  social: SupportLevel;
  nonverbal: SupportLevel;
  inference: SupportLevel;
}

export interface StreakState {
  social: { correct: number; incorrect: number };
  nonverbal: { correct: number; incorrect: number };
  inference: { correct: number; incorrect: number };
}

export type AnswerResult = 'correct' | 'partial' | 'incorrect';

export interface SessionRecord {
  id: string;
  date: string;
  mode: SessionMode;
  score: number;
  maxScore: number;
  itemCount: number;
  endedBy: 'completed' | 'timeout' | 'exit';
  levelSnapshot: LevelState;
  difficultySnapshot: DifficultyState;
  avgResponseMs?: number;
}

export interface DifficultyState {
  social: Difficulty;
  nonverbal: Difficulty;
  inference: Difficulty;
}

// 14 distinct moods with emoji
export type JournalMood =
  | 'happy' | 'excited' | 'proud' | 'calm' | 'loved'
  | 'okay' | 'bored' | 'tired' | 'worried'
  | 'sad' | 'frustrated' | 'angry' | 'confused' | 'overwhelmed';

export interface JournalEntry {
  id: string;
  date: string;
  mood: JournalMood;
  emoji?: string;   // optional extra emoji the kid added
  content: string;
}

export interface CustomReward {
  id: string;
  label: string;
  emoji: string;
  url: string;       // YouTube or other link
  cost: number;      // coins required to unlock
}

export interface ParentConfig {
  dailyMinimum: number;        // sessions per day required before coins are earned
  kidGender?: 'girl' | 'boy' | 'other';
}

export interface CoinsState {
  balance: number;       // current spendable coins
  totalEarned: number;   // lifetime total (never decreases, display only)
  hintTokens: number;    // redeemed hint tokens available to use in practice
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
