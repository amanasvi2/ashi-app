import type {
  SessionRecord, DifficultyState, Difficulty,
  JournalEntry, ParentConfig, CoinsState,
} from './types';
import type { LevelSlice } from './levelReducer';
import { initialLevelState } from './levelReducer';

// ── Sessions ──────────────────────────────────────────────────────────────────

const SESSIONS_KEY = 'ashi_sessions_v1';

export function loadSessions(): SessionRecord[] {
  try { return JSON.parse(localStorage.getItem(SESSIONS_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveSession(record: SessionRecord): void {
  const s = loadSessions();
  s.unshift(record);
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(s.slice(0, 100)));
}

export function getTotalScore(sessions: SessionRecord[]): number {
  return Math.round(sessions.reduce((sum, s) => sum + s.score, 0) * 10) / 10;
}

export function practicedToday(sessions: SessionRecord[]): boolean {
  const today = new Date().toDateString();
  return sessions.some(s => new Date(s.date).toDateString() === today);
}

export function sessionsTodayCount(sessions: SessionRecord[]): number {
  const today = new Date().toDateString();
  return sessions.filter(s => new Date(s.date).toDateString() === today).length;
}

// Consecutive-day streak: counts days backwards from today/yesterday that have ≥1 session.
// If today has a session, streak includes today. If not, yesterday's streak is still alive.
export function calculateStreak(sessions: SessionRecord[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(sessions.map(s => new Date(s.date).toDateString()));
  const today = new Date();
  const todayStr = today.toDateString();
  const yesterdayStr = new Date(new Date().setDate(today.getDate() - 1)).toDateString();

  // If neither today nor yesterday has a session, streak is 0
  if (!days.has(todayStr) && !days.has(yesterdayStr)) return 0;

  const start = new Date(days.has(todayStr) ? today : new Date().setDate(today.getDate() - 1));
  let streak = 0;
  const d = new Date(start);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Support levels ────────────────────────────────────────────────────────────

const LEVELS_KEY = 'ashi_levels_v1';

export function loadLevelSlice(): LevelSlice {
  try {
    const raw = localStorage.getItem(LEVELS_KEY);
    return raw ? JSON.parse(raw) : initialLevelState;
  } catch { return initialLevelState; }
}

export function saveLevelSlice(slice: LevelSlice): void {
  localStorage.setItem(LEVELS_KEY, JSON.stringify(slice));
}

// ── Difficulty preferences ────────────────────────────────────────────────────

const DIFFICULTY_KEY = 'ashi_difficulty_v1';

export const initialDifficulty: DifficultyState = { social: 1, nonverbal: 1, inference: 1 };

export function loadDifficulty(): DifficultyState {
  try {
    const raw = localStorage.getItem(DIFFICULTY_KEY);
    return raw ? JSON.parse(raw) : initialDifficulty;
  } catch { return initialDifficulty; }
}

export function saveDifficulty(state: DifficultyState): void {
  localStorage.setItem(DIFFICULTY_KEY, JSON.stringify(state));
}

const clampDiff = (n: number): Difficulty => Math.max(1, Math.min(3, n)) as Difficulty;

export function updateDifficultyAfterSession(
  prev: DifficultyState,
  pct: number,
  types: Array<'social' | 'nonverbal' | 'inference'>,
): DifficultyState {
  const next = { ...prev };
  for (const t of types) {
    if (pct >= 0.8) next[t] = clampDiff(prev[t] + 1);
    else if (pct < 0.5) next[t] = clampDiff(prev[t] - 1);
  }
  return next;
}

// ── Journal (kid-private) ─────────────────────────────────────────────────────

const JOURNAL_KEY = 'ashi_journal_v1';

export function loadJournalEntries(): JournalEntry[] {
  try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) ?? '[]'); }
  catch { return []; }
}

export function saveJournalEntry(entry: JournalEntry): void {
  const entries = loadJournalEntries().filter(e => e.id !== entry.id);
  entries.unshift(entry);
  localStorage.setItem(JOURNAL_KEY, JSON.stringify(entries.slice(0, 365)));
}

export function todaysJournalEntry(): JournalEntry | null {
  const today = new Date().toDateString();
  return loadJournalEntries().find(e => new Date(e.date).toDateString() === today) ?? null;
}

// Safe for parent view — no content exposed
export function journalWrittenToday(): boolean {
  return todaysJournalEntry() !== null;
}

export function journalActiveDays(pastDays = 7): { date: string; hasEntry: boolean }[] {
  const entries = loadJournalEntries();
  const entryDates = new Set(entries.map(e => new Date(e.date).toDateString()));
  return Array.from({ length: pastDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { date: d.toDateString(), hasEntry: entryDates.has(d.toDateString()) };
  }).reverse();
}

// ── Coins ─────────────────────────────────────────────────────────────────────

const COINS_KEY = 'ashi_coins_v1';
const defaultCoins: CoinsState = { balance: 0, totalEarned: 0, hintTokens: 0 };

export function loadCoins(): CoinsState {
  try {
    const raw = localStorage.getItem(COINS_KEY);
    return raw ? { ...defaultCoins, ...JSON.parse(raw) } : defaultCoins;
  } catch { return defaultCoins; }
}

export function saveCoins(c: CoinsState): void {
  localStorage.setItem(COINS_KEY, JSON.stringify(c));
}

export function addCoins(amount: number): CoinsState {
  const c = loadCoins();
  const next: CoinsState = {
    balance: c.balance + amount,
    totalEarned: c.totalEarned + amount,
    hintTokens: c.hintTokens,
  };
  saveCoins(next);
  return next;
}

// Returns null if insufficient balance
export function spendCoins(amount: number): CoinsState | null {
  const c = loadCoins();
  if (c.balance < amount) return null;
  const next = { ...c, balance: c.balance - amount };
  saveCoins(next);
  return next;
}

export function addHintTokens(count: number): CoinsState {
  const c = loadCoins();
  const next = { ...c, hintTokens: c.hintTokens + count };
  saveCoins(next);
  return next;
}

export function useHintToken(): boolean {
  const c = loadCoins();
  if (c.hintTokens <= 0) return false;
  saveCoins({ ...c, hintTokens: c.hintTokens - 1 });
  return true;
}

// ── Adaptive session count ────────────────────────────────────────────────────

export function pickSessionCount(sessions: SessionRecord[]): number {
  const recent = sessions
    .filter(s => typeof s.avgResponseMs === 'number')
    .slice(0, 5);

  if (recent.length === 0) return 5;

  const avgMs  = recent.reduce((s, r) => s + (r.avgResponseMs as number), 0) / recent.length;
  const avgPct = recent.reduce((s, r) => s + (r.maxScore > 0 ? r.score / r.maxScore : 0), 0) / recent.length;

  let count: number;
  if (avgMs < 12000)      count = 8;
  else if (avgMs < 20000) count = 7;
  else if (avgMs < 30000) count = 6;
  else if (avgMs < 45000) count = 5;
  else                    count = 4;

  if (avgPct >= 0.8)     count = Math.min(10, count + 1);
  else if (avgPct < 0.5) count = Math.max(3,  count - 1);

  return count;
}

// ── Parent config ─────────────────────────────────────────────────────────────

const CONFIG_KEY = 'ashi_config_v1';
const defaultConfig: ParentConfig = {
  dailyMinimum: 1,
  interests: [],
  customRewards: [],
};

export function loadConfig(): ParentConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    return raw ? { ...defaultConfig, ...JSON.parse(raw) } : defaultConfig;
  } catch { return defaultConfig; }
}

export function saveConfig(c: ParentConfig): void {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
}
