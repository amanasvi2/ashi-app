import { useEffect, useState } from 'react';
import type { Difficulty, CustomReward, ParentConfig, SessionRecord, DifficultyState, CoinsState } from '../types';
import {
  loadSessions, getTotalScore, practicedToday,
  loadLevelSlice, loadDifficulty,
  parentJournalWrittenToday, parentJournalActivity,
  loadConfig, saveConfig, loadCoins,
  loadCustomRewards, addCustomReward, deleteCustomReward,
  loadFloorAlarms, loadStudentProfile, initialDifficulty,
  loadConversationSessions, loadConversationEscalation, type ConversationSessionSummary,
} from '../storage';
import type { ItemType } from '../types';
import type { StudentProfileInput } from '../profileTypes';
import { skillById, supportById, isActionableFocusSkill, type ActionableFocusSkillId } from '../skills';
import { TYPE_LABELS, LEVEL_LABELS, LEVEL_COLORS, LevelPips } from '../components/LevelDisplay';
import { conversationTopicById } from '../conversationTopics';

const CONVO_ENDED_REASON_LABELS: Record<string, string> = {
  turn_cap: 'reached the chat limit', time_cap: 'reached the time limit', escalation: 'ended early — see below',
};

// Display-only mirror of server/skillMapping.ts's weight table — which
// item types a focus skill feeds, in plain words for the parent
// explanation. Not the source of truth for actual generation weights.
const SKILL_FEEDS_TYPES: Record<ActionableFocusSkillId, ItemType[]> = {
  identify_problem_and_solutions: ['social'],
  perspective_taking: ['social', 'inference'],
  nonverbal_cues: ['nonverbal'],
  inference_from_text: ['inference'],
  main_idea_summarizing: ['inference'],
  nonliteral_language: ['inference'],
};
import type { StudentSummary } from '../students';
import type { ProfileSummary } from '../profiles';
import { LoadingScreen } from '../components/LoadingScreen';
import type { LevelSlice } from '../adaptiveEngine';
import { initialLevelState } from '../adaptiveEngine';

const DIFF_LABELS: Record<Difficulty, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
// No dedicated hue per difficulty — same neutral chip as the support level.
const DIFF_COLORS: Record<Difficulty, string> = {
  1: 'text-muted bg-rule/40',
  2: 'text-muted bg-rule/40',
  3: 'text-muted bg-rule/40',
};

// ── Small icons ───────────────────────────────────────────────────────────────

function IconCoin({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconCheck({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconJournal({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 4v16l4-2 4 2 4-2 4 2V4l-4 2-4-2-4 2-4-2z"/>
    </svg>
  );
}
function IconTrendUp() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 14 15 20 7"/><polyline points="14 7 20 7 20 13"/></svg>;
}
function IconTrendDown() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 10 13 14 9 20 17"/><polyline points="14 17 20 17 20 11"/></svg>;
}
function IconTrendFlat() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="12" x2="20" y2="12"/></svg>;
}
function IconTrash() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
      <path d="M9 6V4h6v2"/>
    </svg>
  );
}

interface Props {
  onLogout: () => void;
  student: StudentSummary;
  // Only set for a parent with 2+ students — renders the pill switcher.
  students?: StudentSummary[];
  onSwitchStudent?: (id: string) => void;
  // Undefined once the owner is at their student cap (hides the CTA).
  onAddStudent?: () => void;
  // Only set for a clinician viewing one row of their roster.
  onBackToRoster?: () => void;
  incompleteProfile?: ProfileSummary | null;
  onFinishSetup?: (profile: ProfileSummary) => void;
}

export function ParentDashboard({
  onLogout, student, students, onSwitchStudent, onAddStudent, onBackToRoster, incompleteProfile, onFinishSetup,
}: Props) {
  const kidName = student.displayName;

  const [loading, setLoading]   = useState(true);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [levelSlice, setLevelSlice] = useState<LevelSlice>(initialLevelState);
  const [difficulty, setDifficulty] = useState<DifficultyState>(initialDifficulty);
  const [coins, setCoins]       = useState<CoinsState>({ balance: 0, totalEarned: 0, hintTokens: 0 });
  const [config, setConfig]     = useState<ParentConfig>({ dailyMinimum: 1 });
  const [customRewards, setCustomRewards] = useState<CustomReward[]>([]);
  const [journalToday, setJournalToday]   = useState(false);
  const [activityDays, setActivityDays]   = useState<{ date: string; hasEntry: boolean }[]>([]);
  const [floorAlarms, setFloorAlarms]     = useState<Record<ItemType, boolean>>({ social: false, nonverbal: false, inference: false });
  const [profile, setProfile]             = useState<StudentProfileInput | null>(null);
  const [conversations, setConversations] = useState<ConversationSessionSummary[]>([]);
  const [conversationEscalation, setConversationEscalation] = useState(false);
  const [expandedConvoId, setExpandedConvoId] = useState<string | null>(null);

  const [showAddReward, setShowAddReward] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎬');
  const [newUrl, setNewUrl] = useState('');
  const [newCost, setNewCost] = useState(50);

  useEffect(() => {
    (async () => {
      const [s, l, d, c, cfg, rewards, jToday, days, alarms, prof, convos, convoEscalation] = await Promise.all([
        loadSessions(student.id), loadLevelSlice(student.id), loadDifficulty(student.id),
        loadCoins(student.id), loadConfig(student.id),
        loadCustomRewards(student.id), parentJournalWrittenToday(student.id), parentJournalActivity(student.id, 7),
        loadFloorAlarms(student.id), loadStudentProfile(student.id),
        loadConversationSessions(student.id), loadConversationEscalation(student.id),
      ]);
      setSessions(s); setLevelSlice(l); setDifficulty(d); setCoins(c); setConfig(cfg);
      setCustomRewards(rewards); setJournalToday(jToday); setActivityDays(days); setFloorAlarms(alarms);
      setProfile(prof);
      setConversations(convos); setConversationEscalation(convoEscalation);
      setExpandedConvoId(null);
      setLoading(false);
    })();
  }, [student.id]);

  const totalScore = getTotalScore(sessions);
  const doneToday  = practicedToday(sessions);

  const updateDailyMinimum = async (n: number) => {
    setConfig({ ...config, dailyMinimum: n });
    await saveConfig({ ...config, dailyMinimum: n }, student.id);
  };

  const handleAddReward = async () => {
    if (!newLabel.trim() || !newUrl.trim()) return;
    const reward = await addCustomReward(student.id, {
      label: newLabel.trim(), emoji: newEmoji, url: newUrl.trim(), cost: newCost,
    });
    setCustomRewards([...customRewards, reward]);
    setNewLabel(''); setNewUrl(''); setNewEmoji('🎬'); setNewCost(50);
    setShowAddReward(false);
  };

  const handleDeleteReward = async (id: string) => {
    await deleteCustomReward(id);
    setCustomRewards(customRewards.filter(r => r.id !== id));
  };

  function formatDate(iso: string) {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString())
      return `Today, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  const MODE_LABELS: Record<string, string> = {
    mixed: 'Mixed', social: 'Social', nonverbal: 'Nonverbal', inference: 'Inference',
  };

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            {onBackToRoster && (
              <button
                onClick={onBackToRoster}
                className="text-xs font-semibold text-muted hover:text-ink transition-colors mb-1.5"
              >
                ← Back to caseload
              </button>
            )}
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-0.5">Parent view</p>
            <h1 className="text-2xl font-bold text-ink tracking-tight capitalize">{kidName}'s Progress</h1>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-muted hover:text-ink transition-colors mt-1"
          >
            Log out
          </button>
        </div>

        {/* Student switcher — only meaningful for a parent (a clinician adds ─ */}
        {/* students from the roster instead, see onBackToRoster below) ────── */}
        {!onBackToRoster && (students?.length ?? 0) > 1 && (
          <div className="flex gap-2 flex-wrap">
            {students!.map(s => (
              <button
                key={s.id}
                onClick={() => onSwitchStudent?.(s.id)}
                className={`px-3.5 py-1.5 rounded-[4px] text-sm font-medium capitalize transition-colors
                  ${s.id === student.id ? 'bg-accent text-white' : 'bg-surface border border-rule text-muted hover:border-accent/40'}`}
              >
                {s.displayName}
              </button>
            ))}
            {onAddStudent && (
              <button
                onClick={onAddStudent}
                className="px-3.5 py-1.5 rounded-[4px] text-sm font-medium border border-dashed border-rule text-muted hover:border-accent/40 hover:text-accent transition-colors"
              >
                + Add student
              </button>
            )}
          </div>
        )}
        {!onBackToRoster && (students?.length ?? 0) <= 1 && onAddStudent && (
          <button
            onClick={onAddStudent}
            className="text-sm font-medium text-accent hover:text-ink transition-colors"
          >
            + Add another student
          </button>
        )}

        {/* Finish-setup nudge — a profile exists (this owner's or another */}
        {/* one of theirs) with no login created yet */}
        {incompleteProfile && (
          <div className="bg-surface border border-rule shadow-[var(--shadow-raised)] rounded-[4px] p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink">
              <span className="font-semibold capitalize">{incompleteProfile.displayName}</span>'s profile is saved,
              but they don't have a login yet.
            </p>
            <button
              onClick={() => onFinishSetup?.(incompleteProfile)}
              className="shrink-0 text-sm font-semibold text-accent hover:text-ink transition-colors"
            >
              Finish setup
            </button>
          </div>
        )}

        {/* Conversation-practice escalation — the AI partner ended a chat */}
        {/* early because the student disclosed something serious. This is */}
        {/* the one time a conversation transcript matters more than usual. */}
        {conversationEscalation && (
          <div className="bg-alert/5 border border-alert/25 rounded-[4px] p-5 space-y-1.5">
            <p className="text-sm font-semibold text-alert">Worth a look</p>
            <p className="text-sm text-ink">
              {kidName} had a conversation-practice chat where she seemed to be going through something hard.
              The chat ended early. Check the conversation history below, and it may be worth checking in with her.
            </p>
          </div>
        )}

        {/* Floor alarm — the adaptive engine has nothing left to offer for */}
        {/* this type (max support, easiest content) and has stopped serving it */}
        {(Object.keys(floorAlarms) as ItemType[]).some(t => floorAlarms[t]) && (
          <div className="bg-alert/5 border border-alert/25 rounded-[4px] p-5 space-y-1.5">
            <p className="text-sm font-semibold text-alert">Worth a look</p>
            {(Object.keys(floorAlarms) as ItemType[]).filter(t => floorAlarms[t]).map(t => (
              <p key={t} className="text-sm text-ink">
                {kidName} is stuck on <span className="font-medium">{TYPE_LABELS[t]}</span> even with full support
                and the easiest content — practice for it has paused. Consider updating her profile or checking in
                with her teacher.
              </p>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center">
            <p className="text-2xl font-bold text-accent">{totalScore}</p>
            <p className="text-xs text-muted mt-0.5">total pts</p>
          </div>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center">
            <p className="text-2xl font-bold text-ink">{sessions.length}</p>
            <p className="text-xs text-muted mt-0.5">sessions done</p>
          </div>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center">
            <p className="flex items-center justify-center gap-1.5 text-2xl font-bold text-ink"><IconCoin size={18} />{coins.balance}</p>
            <p className="text-xs text-muted mt-0.5">coins available</p>
          </div>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center">
            <p className={`text-2xl font-bold ${journalToday ? 'text-ink' : 'text-muted'}`}>
              {journalToday ? <IconCheck size={20} /> : '–'}
            </p>
            <p className="text-xs text-muted mt-0.5">{journalToday ? 'journal today' : 'no journal yet'}</p>
          </div>
        </div>

        {/* Activity this week */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Activity — last 7 days</h2>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5">
            <div className="flex gap-2 justify-between">
              {activityDays.map(({ date, hasEntry }) => {
                const d = new Date(date);
                const isToday = d.toDateString() === new Date().toDateString();
                const practicedOnDay = sessions.some(
                  s => new Date(s.date).toDateString() === d.toDateString()
                );
                return (
                  <div key={date} className="flex flex-col items-center gap-1.5">
                    <p className={`text-xs ${isToday ? 'font-bold text-ink' : 'text-muted'}`}>
                      {dayLabels[d.getDay()]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {/* Practice dot */}
                      <div
                        title={practicedOnDay ? 'Practiced' : 'No practice'}
                        className={`w-6 h-6 rounded-[4px] flex items-center justify-center
                          ${practicedOnDay ? 'bg-accent text-white' : 'bg-rule/40 text-muted'}`}
                      >
                        {practicedOnDay && <IconCheck />}
                      </div>
                      {/* Journal dot */}
                      <div
                        title={hasEntry ? 'Journal written' : 'No journal'}
                        className={`w-6 h-6 rounded-[4px] flex items-center justify-center
                          ${hasEntry ? 'bg-accent text-white' : 'bg-rule/40 text-muted'}`}
                      >
                        {hasEntry && <IconJournal />}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-4 h-4 rounded-[4px] bg-accent text-white flex items-center justify-center"><IconCheck size={10} /></span> Practice
              </span>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <span className="w-4 h-4 rounded-[4px] bg-accent text-white flex items-center justify-center"><IconJournal size={10} /></span> Journal
              </span>
            </div>
          </div>
        </section>

        {/* Today's status */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Today</h2>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-ink">Practice session</span>
              <span className={`text-sm font-medium ${doneToday ? 'text-ink' : 'text-muted'}`}>
                {doneToday ? 'Done' : 'Not yet'}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <span className="text-sm text-ink">Journal entry</span>
                <p className="text-xs text-muted mt-0.5">Content is private — only {kidName} can see it</p>
              </div>
              <span className={`text-sm font-medium ${journalToday ? 'text-ink' : 'text-muted'}`}>
                {journalToday ? 'Written' : 'Not yet'}
              </span>
            </div>
          </div>
        </section>

        {/* Skill levels */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Current skill levels</h2>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
            {(['social', 'nonverbal', 'inference'] as const).map(key => {
              const level = levelSlice.levels[key];
              const diff  = difficulty[key];

              // Trend: compare most recent two sessions that have a difficultySnapshot
              const snap0 = sessions[0]?.difficultySnapshot?.[key];
              const snap1 = sessions[1]?.difficultySnapshot?.[key];
              const trend =
                snap0 === undefined || snap1 === undefined ? null :
                snap0 > snap1 ? 'up' :
                snap0 < snap1 ? 'down' : 'same';

              const trendEl =
                trend === 'up'   ? <span className="text-muted" title="Questions got harder"><IconTrendUp /></span> :
                trend === 'down' ? <span className="text-muted" title="Questions got easier"><IconTrendDown /></span> :
                trend === 'same' ? <span className="text-muted" title="No change"><IconTrendFlat /></span> :
                null;

              return (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-ink">{TYPE_LABELS[key]}</span>
                    <div className="flex items-center gap-2">
                      <LevelPips level={level} />
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-[4px] ${LEVEL_COLORS[level]}`}>
                        {LEVEL_LABELS[level]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-muted">Question difficulty:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] ${DIFF_COLORS[diff]}`}>
                      {DIFF_LABELS[diff]}
                    </span>
                    {trendEl}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* How this is tailored — plain-language explanation of the profile */}
        {/* the parent gave at intake, and what it actually changes in the app */}
        {profile && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">
              How this is tailored to {kidName}
            </h2>
            <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-5">
              <p className="text-sm text-muted">
                This comes from what you told us about {kidName} when you set up her profile.
                It shapes which kinds of questions she gets and how much support she starts with.
              </p>

              {profile.focus.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">Focus areas</p>
                  <div className="space-y-2">
                    {profile.focus.map(id => {
                      const label = skillById(id)?.label ?? id;
                      const actionable = isActionableFocusSkill(id);
                      const types = actionable ? SKILL_FEEDS_TYPES[id] : [];
                      return (
                        <div key={id} className="flex items-start justify-between gap-3">
                          <span className="text-sm text-ink">{label}</span>
                          {actionable ? (
                            <span className="text-xs text-muted text-right shrink-0">
                              More {types.map(t => TYPE_LABELS[t]).join(' & ')}
                            </span>
                          ) : (
                            <span className="text-xs text-muted text-right shrink-0">
                              Not in practice sessions yet
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {profile.strengths.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">Strengths</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.strengths.map(id => (
                      <span key={id} className="text-xs text-ink bg-rule/40 px-2.5 py-1 rounded-[4px]">
                        {skillById(id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.supports.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">Supports we use</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.supports.map(id => (
                      <span key={id} className="text-xs text-ink bg-rule/40 px-2.5 py-1 rounded-[4px]">
                        {supportById(id)?.label ?? id}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {profile.interests.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-ink mb-2">Interests</p>
                  <p className="text-xs text-muted mb-2">Used to make scenarios feel more familiar to her.</p>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.interests.map(interest => (
                      <span key={interest} className="text-xs text-ink bg-rule/40 px-2.5 py-1 rounded-[4px]">
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-xs text-muted pt-1 border-t border-rule">
                The support level and question difficulty shown above adjust automatically based on
                how {kidName} is doing — you don't need to change anything here as she improves.
              </p>
            </div>
          </section>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Recent practice sessions</h2>
            <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
              {sessions.slice(0, 10).map(s => {
                const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-ink font-medium">{formatDate(s.date)}</p>
                      <p className="text-xs text-muted">{MODE_LABELS[s.mode]} · {s.itemCount} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-ink">{s.score} / {s.maxScore}</p>
                      <p className="text-xs font-medium text-muted">{pct}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {sessions.length === 0 && (
          <p className="text-center text-sm text-muted py-4">No practice sessions yet.</p>
        )}

        {/* Conversation history — deliberately owner-visible, the opposite */}
        {/* of the journal below. Ashi is told this plainly before she starts. */}
        {conversations.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Conversation history</h2>
            <p className="text-xs text-muted mb-3">
              {kidName} is told you can read these — that's different from her journal, which always stays private.
            </p>
            <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
              {conversations.map(c => {
                const isOpen = expandedConvoId === c.id;
                const topicLabel = conversationTopicById(c.topic)?.label ?? c.topic;
                return (
                  <div key={c.id}>
                    <button
                      onClick={() => setExpandedConvoId(isOpen ? null : c.id)}
                      className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-paper/60 transition-colors"
                    >
                      <div>
                        <p className="text-sm text-ink font-medium">{formatDate(c.startedAt)} · {topicLabel}</p>
                        <p className="text-xs text-muted">
                          {c.turnCount} {c.turnCount === 1 ? 'exchange' : 'exchanges'}
                          {c.endedReason ? ` · ${CONVO_ENDED_REASON_LABELS[c.endedReason] ?? c.endedReason}` : ''}
                        </p>
                      </div>
                      <span className={`text-muted transition-transform shrink-0 ${isOpen ? 'rotate-90' : ''}`}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="9 18 15 12 9 6"/>
                        </svg>
                      </span>
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 space-y-2">
                        {c.transcript.map((m, i) => (
                          <p key={i} className={`text-sm leading-snug ${m.role === 'user' ? 'text-ink' : 'text-muted'}`}>
                            <span className="font-semibold capitalize">{m.role === 'user' ? kidName : 'Alex'}:</span> {m.content}
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* App settings */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">App settings</h2>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-ink mb-1">Daily session goal</p>
              <p className="text-xs text-muted mb-3">
                Coins are earned for each session BEYOND this number.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => updateDailyMinimum(n)}
                    className={`flex-1 py-2.5 rounded-[4px] text-sm font-semibold border transition-colors
                      ${config.dailyMinimum === n
                        ? 'bg-accent text-white border-accent'
                        : 'border-rule text-muted hover:border-accent/40'}`}
                  >
                    {n} {n === 1 ? 'session' : 'sessions'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Rewards management */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Video rewards</h2>
          <div className="space-y-2">
            {customRewards.map(r => (
              <div key={r.id} className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{r.label}</p>
                  <p className="flex items-center gap-1 text-xs text-muted"><IconCoin />{r.cost} coins</p>
                </div>
                <button
                  onClick={() => handleDeleteReward(r.id)}
                  className="text-muted hover:text-ink transition-colors p-1"
                >
                  <IconTrash />
                </button>
              </div>
            ))}

            {!showAddReward ? (
              <button
                onClick={() => setShowAddReward(true)}
                className="w-full py-3 rounded-[4px] border-2 border-dashed border-rule text-sm text-muted
                           hover:border-accent/40 hover:text-accent transition-colors"
              >
                + Add a video reward
              </button>
            ) : (
              <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-3">
                <p className="text-sm font-semibold text-ink">Add reward</p>
                <div className="flex gap-2">
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={2}
                    className="w-14 rounded-[4px] border border-rule px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-accent/40"
                    placeholder="🎬"
                  />
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Reward name"
                    className="flex-1 rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink
                               placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                  />
                </div>
                <input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="YouTube URL"
                  type="url"
                  className="w-full rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink
                             placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40"
                />
                <div>
                  <p className="text-xs text-muted mb-2">Cost in coins:</p>
                  <div className="flex gap-2">
                    {[10, 25, 50, 100].map(c => (
                      <button
                        key={c}
                        onClick={() => setNewCost(c)}
                        className={`flex items-center justify-center gap-1 flex-1 py-2 rounded-[4px] text-xs font-semibold border transition-colors
                          ${newCost === c ? 'bg-accent text-white border-accent' : 'border-rule text-muted hover:border-accent/40'}`}
                      >
                        <IconCoin />{c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddReward(false); setNewLabel(''); setNewUrl(''); }}
                    className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold border border-rule text-ink hover:bg-paper"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddReward}
                    disabled={!newLabel.trim() || !newUrl.trim()}
                    className="flex-1 py-2.5 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add reward
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-muted pb-4">
          Journal content is private and only visible to {kidName}.
        </p>
      </div>
    </div>
  );
}
