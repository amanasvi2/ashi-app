import { supabase } from './supabase';
import { callApi } from './api';
import type {
  SessionRecord, DifficultyState,
  JournalEntry, ParentConfig, CoinsState, CustomReward,
  ItemType, SupportLevel, AnswerResult,
} from './types';
import type { LevelSlice, PersistedLevelState } from './adaptiveEngine';
import { initialPersistedLevelState, resolveSessionStart } from './adaptiveEngine';
import type { StudentProfileInput } from './profileTypes';

async function currentUserId(): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in');
  return user.id;
}

// ── Sessions ──────────────────────────────────────────────────────────────────

// No implicit RLS-only filtering — an owner with several students would
// otherwise get every student's sessions interleaved into one list. Same
// optional-studentId pattern as loadConfig/loadCustomRewards above.
export async function loadSessions(studentId?: string): Promise<SessionRecord[]> {
  let query = supabase.from('practice_sessions').select('*').order('date', { ascending: false }).limit(100);
  if (studentId) query = query.eq('student_id', studentId);
  const { data } = await query;
  return (data ?? []).map(row => ({
    id: row.id,
    date: row.date,
    mode: row.mode,
    score: row.score,
    maxScore: row.max_score,
    itemCount: row.item_count,
    endedBy: row.ended_by,
    levelSnapshot: row.level_snapshot,
    difficultySnapshot: row.difficulty_snapshot,
    avgResponseMs: row.avg_response_ms ?? undefined,
  }));
}

export async function saveSession(record: SessionRecord): Promise<void> {
  const studentId = await currentUserId();
  await supabase.from('practice_sessions').insert({
    id: record.id,
    student_id: studentId,
    date: record.date,
    mode: record.mode,
    score: record.score,
    max_score: record.maxScore,
    item_count: record.itemCount,
    ended_by: record.endedBy,
    level_snapshot: record.levelSnapshot,
    difficulty_snapshot: record.difficultySnapshot,
    avg_response_ms: record.avgResponseMs ?? null,
  });
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

// Called at the start of every session: resolves any queued level change
// or 14-day gap re-entry (see adaptiveEngine.ts's resolveSessionStart) and
// persists the result — so a change earned last session applies exactly
// once, here, and never mid-session.
// `studentId` is optional and defaults to the caller's own id (the kid,
// mid-session). An owner reading a specific student's levels for display
// (the parent dashboard / roster) must pass it explicitly — same real bug
// as loadConfig/loadSessions above: without this, an owner's own call
// resolved to *their* id, which matches no real level_state row, so the
// dashboard always silently showed the default (level 3 / no data) rather
// than the student's actual levels. Passing an explicit studentId also
// skips the session-boundary resolve-and-write below, which only makes
// sense when the kid herself is starting a session, not when an owner is
// just looking.
export async function loadLevelSlice(studentId?: string): Promise<LevelSlice> {
  if (studentId) {
    const { data } = await supabase
      .from('level_state')
      .select('levels, streaks, pending')
      .eq('student_id', studentId)
      .maybeSingle();
    return data
      ? { levels: data.levels, streaks: data.streaks, pending: data.pending }
      : { levels: initialPersistedLevelState.levels, streaks: initialPersistedLevelState.streaks, pending: initialPersistedLevelState.pending };
  }

  const id = await currentUserId();
  const { data } = await supabase
    .from('level_state')
    .select('levels, streaks, pending, last_session_at')
    .eq('student_id', id)
    .maybeSingle();

  const persisted: PersistedLevelState = data
    ? { levels: data.levels, streaks: data.streaks, pending: data.pending, lastSessionAt: data.last_session_at }
    : initialPersistedLevelState;

  const resolved = resolveSessionStart(persisted, new Date());

  await supabase.from('level_state').update({
    levels: resolved.levels,
    streaks: resolved.streaks,
    pending: resolved.pending,
    last_session_at: resolved.lastSessionAt,
  }).eq('student_id', id);

  return { levels: resolved.levels, streaks: resolved.streaks, pending: resolved.pending };
}

// Called after every answer during a session — levels never change here
// (see adaptiveEngine.ts's nextLevelState), only streaks and the queued
// pending change for next session.
export async function saveLevelSlice(slice: LevelSlice): Promise<void> {
  const studentId = await currentUserId();
  await supabase.from('level_state')
    .update({ levels: slice.levels, streaks: slice.streaks, pending: slice.pending })
    .eq('student_id', studentId);
}

// ── Difficulty preferences ────────────────────────────────────────────────────

export const initialDifficulty: DifficultyState = { social: 1, nonverbal: 1, inference: 1 };

export async function loadDifficulty(studentId?: string): Promise<DifficultyState> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('difficulty_state')
    .select('state')
    .eq('student_id', id)
    .maybeSingle();
  return data ? (data.state as DifficultyState) : initialDifficulty;
}

// Difficulty/mastery/floor-alarm are decided server-side (they need the
// cross-session rolling window in item_attempts) — see api/recompute-difficulty.ts.
export async function recomputeDifficulty(types: ItemType[]): Promise<{
  difficulty: DifficultyState;
  mastery: Record<ItemType, boolean>;
  floorAlarm: Record<ItemType, boolean>;
}> {
  return callApi('/api/recompute-difficulty', { types });
}

const DEFAULT_FLAGS = { social: false, nonverbal: false, inference: false };

// Takes an explicit studentId since this is read by the parent dashboard
// about their child, not by the student about themselves (RLS's
// "parent reads own students' difficulty_state" policy covers this read).
export async function loadFloorAlarms(studentId: string): Promise<Record<ItemType, boolean>> {
  const { data } = await supabase
    .from('difficulty_state')
    .select('floor_alarm')
    .eq('student_id', studentId)
    .maybeSingle();
  return data?.floor_alarm ?? DEFAULT_FLAGS;
}

// Same explicit-studentId reasoning as loadFloorAlarms above — the parent
// dashboard reads this about their child, not about the signed-in user.
export async function loadStudentProfile(studentId: string): Promise<StudentProfileInput | null> {
  const { data } = await supabase
    .from('student_profiles')
    .select('display_name, grade, reading_level, strengths, focus, supports, session_length_min, interests')
    .eq('student_id', studentId)
    .eq('is_active', true)
    .maybeSingle();
  if (!data) return null;
  return {
    display_name: data.display_name,
    grade: data.grade,
    reading_level: data.reading_level,
    strengths: data.strengths ?? [],
    focus: data.focus ?? [],
    supports: data.supports ?? [],
    session_length_min: data.session_length_min,
    interests: data.interests ?? [],
  };
}

// One row per answered item — feeds the rolling-window calculations above.
export async function recordAttempt(
  itemType: ItemType,
  supportLevel: SupportLevel,
  difficulty: number,
  optionCount: number | null,
  result: AnswerResult,
): Promise<void> {
  await callApi('/api/record-attempt', { itemType, supportLevel, difficulty, optionCount, result });
}

// ── Journal (kid-private — RLS scopes every row to the student themselves) ─────

export async function loadJournalEntries(): Promise<JournalEntry[]> {
  const studentId = await currentUserId();
  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('student_id', studentId)
    .order('date', { ascending: false })
    .limit(365);
  return (data ?? []).map(row => ({
    id: row.id,
    date: row.date,
    mood: row.mood,
    emoji: row.emoji ?? undefined,
    content: row.content,
  }));
}

export async function saveJournalEntry(entry: JournalEntry): Promise<void> {
  const studentId = await currentUserId();
  await supabase.from('journal_entries').upsert({
    id: entry.id,
    student_id: studentId,
    date: entry.date,
    mood: entry.mood,
    emoji: entry.emoji ?? null,
    content: entry.content,
  });
}

export async function todaysJournalEntry(): Promise<JournalEntry | null> {
  const entries = await loadJournalEntries();
  const today = new Date().toDateString();
  return entries.find(e => new Date(e.date).toDateString() === today) ?? null;
}

// Safe for kid view — this is the student reading their own content.
export async function journalWrittenToday(): Promise<boolean> {
  return (await todaysJournalEntry()) !== null;
}

// ── Journal (parent view — dates only, via the privacy-preserving RPC; ────────
// ── content is never readable by the parent, by RLS design)              ─────

export async function parentJournalActivity(
  studentId: string,
  pastDays = 7,
): Promise<{ date: string; hasEntry: boolean }[]> {
  const { data } = await supabase.rpc('journal_activity_for_owner', { p_student_id: studentId });
  const entryDates = new Set((data ?? []).map((row: { date: string }) => new Date(row.date).toDateString()));
  return Array.from({ length: pastDays }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return { date: d.toDateString(), hasEntry: entryDates.has(d.toDateString()) };
  }).reverse();
}

export async function parentJournalWrittenToday(studentId: string): Promise<boolean> {
  const [today] = await parentJournalActivity(studentId, 1);
  return today?.hasEntry ?? false;
}

// ── Conversation Practice (owner-visible on purpose — the student is told ───
// ── this plainly, unlike the journal above, which stays private) ────────────

export interface ConversationTranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

export interface ConversationSessionSummary {
  id: string;
  topic: string;
  startedAt: string;
  endedAt: string | null;
  turnCount: number;
  endedReason: string | null;
  escalation: boolean;
  transcript: ConversationTranscriptEntry[];
}

export async function loadConversationSessions(studentId?: string): Promise<ConversationSessionSummary[]> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('conversation_sessions')
    .select('id, topic, started_at, ended_at, turn_count, ended_reason, escalation, transcript')
    .eq('student_id', id)
    .order('started_at', { ascending: false })
    .limit(50);
  return (data ?? []).map(row => ({
    id: row.id,
    topic: row.topic,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    turnCount: row.turn_count,
    endedReason: row.ended_reason,
    escalation: row.escalation,
    transcript: row.transcript ?? [],
  }));
}

export async function loadConversationEscalation(studentId?: string): Promise<boolean> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('conversation_sessions')
    .select('id')
    .eq('student_id', id)
    .eq('escalation', true)
    .limit(1);
  return (data ?? []).length > 0;
}

// ── Coins ─────────────────────────────────────────────────────────────────────

const defaultCoins: CoinsState = { balance: 0, totalEarned: 0, hintTokens: 0 };

export async function loadCoins(studentId?: string): Promise<CoinsState> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('coins_state')
    .select('balance, total_earned, hint_tokens')
    .eq('student_id', id)
    .maybeSingle();
  return data ? { balance: data.balance, totalEarned: data.total_earned, hintTokens: data.hint_tokens } : defaultCoins;
}

async function saveCoins(c: CoinsState): Promise<void> {
  const studentId = await currentUserId();
  await supabase.from('coins_state')
    .update({ balance: c.balance, total_earned: c.totalEarned, hint_tokens: c.hintTokens })
    .eq('student_id', studentId);
}

export async function addCoins(amount: number): Promise<CoinsState> {
  const c = await loadCoins();
  const next: CoinsState = {
    balance: c.balance + amount,
    totalEarned: c.totalEarned + amount,
    hintTokens: c.hintTokens,
  };
  await saveCoins(next);
  return next;
}

// Returns null if insufficient balance
export async function spendCoins(amount: number): Promise<CoinsState | null> {
  const c = await loadCoins();
  if (c.balance < amount) return null;
  const next = { ...c, balance: c.balance - amount };
  await saveCoins(next);
  return next;
}

export async function addHintTokens(count: number): Promise<CoinsState> {
  const c = await loadCoins();
  const next = { ...c, hintTokens: c.hintTokens + count };
  await saveCoins(next);
  return next;
}

export async function useHintToken(): Promise<boolean> {
  const c = await loadCoins();
  if (c.hintTokens <= 0) return false;
  await saveCoins({ ...c, hintTokens: c.hintTokens - 1 });
  return true;
}

// ── Adaptive session count ─────────────────────────────────────────────────────

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

// ── Parent config (daily goal + AI-partner gender; interests live on ─────────
// ── student_profiles instead — see loadInterests/saveInterests below) ────────

const defaultConfig: ParentConfig = { dailyMinimum: 1 };

// `studentId` is optional and defaults to the caller's own id — every kid-
// self call site (Home.tsx, ProfilePanel.tsx, RewardsPage.tsx) is
// unaffected. An owner viewing a specific one of their (possibly several)
// students must pass it explicitly, the same way loadFloorAlarms/
// loadStudentProfile above already do. Passing it explicitly is also the
// fix for a real pre-existing bug: these previously always resolved via
// the *caller's own* id, so calling them from the parent dashboard (the
// parent's id, not the student's) silently matched zero rows.
export async function loadConfig(studentId?: string): Promise<ParentConfig> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('parent_config')
    .select('daily_minimum, kid_gender')
    .eq('student_id', id)
    .maybeSingle();
  return data ? { dailyMinimum: data.daily_minimum, kidGender: data.kid_gender ?? undefined } : defaultConfig;
}

// Parent-driven (daily goal).
export async function saveConfig(c: ParentConfig, studentId?: string): Promise<void> {
  const id = studentId ?? await currentUserId();
  await supabase.from('parent_config').update({ daily_minimum: c.dailyMinimum }).eq('student_id', id);
}

// Kid-driven (self-edited via ProfilePanel, same as the original app).
export async function updateKidGender(gender: 'girl' | 'boy' | 'other', studentId?: string): Promise<void> {
  const id = studentId ?? await currentUserId();
  await supabase.from('parent_config').update({ kid_gender: gender }).eq('student_id', id);
}

// ── Interests (student_profiles — kid self-edits these directly) ─────────────

export async function loadInterests(studentId?: string): Promise<string[]> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase
    .from('student_profiles')
    .select('interests')
    .eq('student_id', id)
    .eq('is_active', true)
    .maybeSingle();
  return data?.interests ?? [];
}

export async function saveInterests(interests: string[], studentId?: string): Promise<void> {
  const id = studentId ?? await currentUserId();
  await supabase.from('student_profiles')
    .update({ interests })
    .eq('student_id', id)
    .eq('is_active', true);
}

// ── Custom rewards ────────────────────────────────────────────────────────────

// No implicit RLS-only filtering here on purpose — with one owner able to
// have several students, an unfiltered select would return rewards across
// *all* of the owner's students, not just the one being viewed.
export async function loadCustomRewards(studentId?: string): Promise<CustomReward[]> {
  const id = studentId ?? await currentUserId();
  const { data } = await supabase.from('custom_rewards').select('*').eq('student_id', id);
  return (data ?? []).map(row => ({ id: row.id, label: row.label, emoji: row.emoji, url: row.url, cost: row.cost }));
}

export async function addCustomReward(studentId: string, reward: Omit<CustomReward, 'id'>): Promise<CustomReward> {
  const { data, error } = await supabase
    .from('custom_rewards')
    .insert({ student_id: studentId, label: reward.label, emoji: reward.emoji, url: reward.url, cost: reward.cost })
    .select()
    .single();
  if (error || !data) throw error ?? new Error('Could not add reward');
  return { id: data.id, label: data.label, emoji: data.emoji, url: data.url, cost: data.cost };
}

export async function deleteCustomReward(id: string): Promise<void> {
  await supabase.from('custom_rewards').delete().eq('id', id);
}
