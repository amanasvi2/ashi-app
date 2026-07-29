import { useEffect, useState } from 'react';
import type { SupportLevel, Difficulty, CustomReward, ParentConfig, SessionRecord, DifficultyState, CoinsState } from '../types';
import {
  loadSessions, getTotalScore, practicedToday,
  loadLevelSlice, loadDifficulty,
  parentJournalWrittenToday, parentJournalActivity,
  loadConfig, saveConfig, loadCoins,
  loadCustomRewards, addCustomReward, deleteCustomReward,
  loadFloorAlarms, initialDifficulty,
} from '../storage';
import type { ItemType } from '../types';

const TYPE_LABELS: Record<ItemType, string> = {
  social: 'Social Problems', nonverbal: 'Nonverbal Cues', inference: 'Text Inference',
};
import type { StudentSummary } from '../students';
import { LoadingScreen } from '../components/LoadingScreen';
import type { LevelSlice } from '../adaptiveEngine';
import { initialLevelState } from '../adaptiveEngine';

const LEVEL_LABELS: Record<SupportLevel, string> = { 3: 'Most help', 2: 'Word bank', 1: 'Some help', 0: 'No hints' };
const LEVEL_COLORS: Record<SupportLevel, string> = {
  3: 'text-slate-500 bg-slate-100',
  2: 'text-sky-700 bg-sky-50',
  1: 'text-amber-700 bg-amber-50',
  0: 'text-emerald-700 bg-emerald-50',
};
const DIFF_LABELS: Record<Difficulty, string> = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const DIFF_COLORS: Record<Difficulty, string> = {
  1: 'text-emerald-700 bg-emerald-50',
  2: 'text-amber-700 bg-amber-50',
  3: 'text-rose-700 bg-rose-50',
};

function LevelPips({ level }: { level: SupportLevel }) {
  const filled = 3 - level;
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < filled ? 'bg-blue-500' : 'bg-slate-200'}`} />
      ))}
    </span>
  );
}

interface Props {
  onLogout: () => void;
  student: StudentSummary;
}

export function ParentDashboard({ onLogout, student }: Props) {
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

  const [showAddReward, setShowAddReward] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newEmoji, setNewEmoji] = useState('🎬');
  const [newUrl, setNewUrl] = useState('');
  const [newCost, setNewCost] = useState(50);

  useEffect(() => {
    (async () => {
      const [s, l, d, c, cfg, rewards, jToday, days, alarms] = await Promise.all([
        loadSessions(), loadLevelSlice(), loadDifficulty(), loadCoins(), loadConfig(),
        loadCustomRewards(), parentJournalWrittenToday(student.id), parentJournalActivity(student.id, 7),
        loadFloorAlarms(student.id),
      ]);
      setSessions(s); setLevelSlice(l); setDifficulty(d); setCoins(c); setConfig(cfg);
      setCustomRewards(rewards); setJournalToday(jToday); setActivityDays(days); setFloorAlarms(alarms);
      setLoading(false);
    })();
  }, [student.id]);

  const totalScore = getTotalScore(sessions);
  const doneToday  = practicedToday(sessions);

  const updateDailyMinimum = async (n: number) => {
    setConfig({ ...config, dailyMinimum: n });
    await saveConfig({ ...config, dailyMinimum: n });
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
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-0.5">Parent view</p>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight capitalize">{kidName}'s Progress</h1>
          </div>
          <button
            onClick={onLogout}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors mt-1"
          >
            Log out
          </button>
        </div>

        {/* Floor alarm — the adaptive engine has nothing left to offer for */}
        {/* this type (max support, easiest content) and has stopped serving it */}
        {(Object.keys(floorAlarms) as ItemType[]).some(t => floorAlarms[t]) && (
          <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-1.5">
            <p className="text-sm font-semibold text-rose-800">Worth a look</p>
            {(Object.keys(floorAlarms) as ItemType[]).filter(t => floorAlarms[t]).map(t => (
              <p key={t} className="text-sm text-rose-700">
                {kidName} is stuck on <span className="font-medium">{TYPE_LABELS[t]}</span> even with full support
                and the easiest content — practice for it has paused. Consider updating her profile or checking in
                with her teacher.
              </p>
            ))}
          </div>
        )}

        {/* Quick stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">{totalScore}</p>
            <p className="text-xs text-slate-400 mt-0.5">total pts</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-slate-800">{sessions.length}</p>
            <p className="text-xs text-slate-400 mt-0.5">sessions done</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className="text-2xl font-bold text-amber-500">⭐ {coins.balance}</p>
            <p className="text-xs text-slate-400 mt-0.5">coins available</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center">
            <p className={`text-2xl font-bold ${journalToday ? 'text-emerald-600' : 'text-slate-300'}`}>
              {journalToday ? '✓' : '–'}
            </p>
            <p className="text-xs text-slate-400 mt-0.5">{journalToday ? 'journal today' : 'no journal yet'}</p>
          </div>
        </div>

        {/* Activity this week */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Activity — last 7 days</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-5">
            <div className="flex gap-2 justify-between">
              {activityDays.map(({ date, hasEntry }) => {
                const d = new Date(date);
                const isToday = d.toDateString() === new Date().toDateString();
                const practicedOnDay = sessions.some(
                  s => new Date(s.date).toDateString() === d.toDateString()
                );
                return (
                  <div key={date} className="flex flex-col items-center gap-1.5">
                    <p className={`text-xs ${isToday ? 'font-bold text-blue-600' : 'text-slate-400'}`}>
                      {dayLabels[d.getDay()]}
                    </p>
                    <div className="flex flex-col gap-1">
                      {/* Practice dot */}
                      <div
                        title={practicedOnDay ? 'Practiced' : 'No practice'}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${practicedOnDay ? 'bg-blue-500 text-white' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {practicedOnDay ? '✓' : ''}
                      </div>
                      {/* Journal dot */}
                      <div
                        title={hasEntry ? 'Journal written' : 'No journal'}
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                          ${hasEntry ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-300'}`}
                      >
                        {hasEntry ? '✓' : ''}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-4 mt-4 justify-center">
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Practice
              </span>
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <span className="w-3 h-3 rounded-full bg-amber-400 inline-block" /> Journal
              </span>
            </div>
          </div>
        </section>

        {/* Today's status */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Today</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            <div className="flex items-center justify-between px-5 py-3.5">
              <span className="text-sm text-slate-700">Practice session</span>
              <span className={`text-sm font-medium ${doneToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                {doneToday ? '✓ Done' : 'Not yet'}
              </span>
            </div>
            <div className="flex items-center justify-between px-5 py-3.5">
              <div>
                <span className="text-sm text-slate-700">Journal entry</span>
                <p className="text-xs text-slate-400 mt-0.5">Content is private — only {kidName} can see it</p>
              </div>
              <span className={`text-sm font-medium ${journalToday ? 'text-emerald-600' : 'text-slate-400'}`}>
                {journalToday ? '✓ Written' : 'Not yet'}
              </span>
            </div>
          </div>
        </section>

        {/* Skill levels */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Current skill levels</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {(['social', 'nonverbal', 'inference'] as const).map(key => {
              const labels = { social: 'Social Problems', nonverbal: 'Nonverbal Cues', inference: 'Text Inference' };
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
                trend === 'up'   ? <span className="text-xs font-bold text-rose-500"   title="Questions got harder">↑</span> :
                trend === 'down' ? <span className="text-xs font-bold text-emerald-500" title="Questions got easier">↓</span> :
                trend === 'same' ? <span className="text-xs text-slate-300"             title="No change">→</span> :
                null;

              return (
                <div key={key} className="px-5 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{labels[key]}</span>
                    <div className="flex items-center gap-2">
                      <LevelPips level={level} />
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEVEL_COLORS[level]}`}>
                        {LEVEL_LABELS[level]}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-xs text-slate-400">Question difficulty:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFF_COLORS[diff]}`}>
                      {DIFF_LABELS[diff]}
                    </span>
                    {trendEl}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Recent sessions */}
        {sessions.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent practice sessions</h2>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
              {sessions.slice(0, 10).map(s => {
                const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm text-slate-700 font-medium">{formatDate(s.date)}</p>
                      <p className="text-xs text-slate-400">{MODE_LABELS[s.mode]} · {s.itemCount} items</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-slate-800">{s.score} / {s.maxScore}</p>
                      <p className={`text-xs font-medium ${pct >= 80 ? 'text-emerald-600' : pct >= 50 ? 'text-amber-600' : 'text-slate-400'}`}>
                        {pct}%
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {sessions.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-4">No practice sessions yet.</p>
        )}

        {/* App settings */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">App settings</h2>
          <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-800 mb-1">Daily session goal</p>
              <p className="text-xs text-slate-500 mb-3">
                Coins are earned for each session BEYOND this number.
              </p>
              <div className="flex gap-2">
                {[1, 2, 3].map(n => (
                  <button
                    key={n}
                    onClick={() => updateDailyMinimum(n)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all
                      ${config.dailyMinimum === n
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
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
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Video rewards</h2>
          <div className="space-y-2">
            {customRewards.map(r => (
              <div key={r.id} className="bg-white rounded-xl border border-slate-100 px-4 py-3 flex items-center gap-3">
                <span className="text-xl">{r.emoji}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{r.label}</p>
                  <p className="text-xs text-slate-400">⭐ {r.cost} coins</p>
                </div>
                <button
                  onClick={() => handleDeleteReward(r.id)}
                  className="text-slate-300 hover:text-red-400 transition-colors p-1"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/>
                    <path d="M9 6V4h6v2"/>
                  </svg>
                </button>
              </div>
            ))}

            {!showAddReward ? (
              <button
                onClick={() => setShowAddReward(true)}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-200 text-sm text-slate-400
                           hover:border-blue-300 hover:text-blue-500 transition-colors"
              >
                + Add a video reward
              </button>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                <p className="text-sm font-semibold text-slate-800">Add reward</p>
                <div className="flex gap-2">
                  <input
                    value={newEmoji}
                    onChange={e => setNewEmoji(e.target.value)}
                    maxLength={2}
                    className="w-14 rounded-xl border border-slate-200 px-3 py-2.5 text-center text-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                    placeholder="🎬"
                  />
                  <input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Reward name"
                    className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800
                               placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                </div>
                <input
                  value={newUrl}
                  onChange={e => setNewUrl(e.target.value)}
                  placeholder="YouTube URL"
                  type="url"
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800
                             placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
                <div>
                  <p className="text-xs text-slate-500 mb-2">Cost in coins:</p>
                  <div className="flex gap-2">
                    {[10, 25, 50, 100].map(c => (
                      <button
                        key={c}
                        onClick={() => setNewCost(c)}
                        className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all
                          ${newCost === c ? 'bg-amber-500 text-white border-amber-500' : 'border-slate-200 text-slate-600 hover:border-amber-300'}`}
                      >
                        ⭐ {c}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { setShowAddReward(false); setNewLabel(''); setNewUrl(''); }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddReward}
                    disabled={!newLabel.trim() || !newUrl.trim()}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700
                               disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Add reward
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        <p className="text-center text-xs text-slate-300 pb-4">
          Journal content is private and only visible to {kidName}.
        </p>
      </div>
    </div>
  );
}
