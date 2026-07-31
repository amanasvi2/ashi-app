import { useEffect, useState } from 'react';
import type { Difficulty, SessionRecord, ParentConfig, CoinsState, DifficultyState } from '../types';
import {
  loadSessions, getTotalScore, calculateStreak,
  sessionsTodayCount, loadConfig, loadLevelSlice, loadDifficulty, loadCoins,
  initialDifficulty,
} from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';
import type { LevelSlice } from '../adaptiveEngine';
import { initialLevelState } from '../adaptiveEngine';
import { TYPE_LABELS, LEVEL_LABELS, LEVEL_COLORS, LevelPips } from '../components/LevelDisplay';

const DIFF_LABELS: Record<Difficulty, string>  = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
// No dedicated hue per difficulty — same neutral chip as the support level,
// the label text carries the meaning.
const DIFF_COLORS: Record<Difficulty, string>  = {
  1: 'text-muted bg-rule/40',
  2: 'text-muted bg-rule/40',
  3: 'text-muted bg-rule/40',
};

function IconStreak() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="4" y2="14"/><line x1="10" y1="20" x2="10" y2="10"/><line x1="16" y1="20" x2="16" y2="6"/>
    </svg>
  );
}
function IconCoin() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}
function IconHint() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.75V17h8v-2.25A7 7 0 0 0 12 2z"/>
    </svg>
  );
}

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

export function ProgressPage() {
  const [loading, setLoading]     = useState(true);
  const [sessions, setSessions]   = useState<SessionRecord[]>([]);
  const [levelSlice, setLevelSlice] = useState<LevelSlice>(initialLevelState);
  const [difficulty, setDifficulty] = useState<DifficultyState>(initialDifficulty);
  const [coins, setCoins]         = useState<CoinsState>({ balance: 0, totalEarned: 0, hintTokens: 0 });
  const [config, setConfig]       = useState<ParentConfig>({ dailyMinimum: 1 });

  useEffect(() => {
    (async () => {
      const [s, l, d, c, cfg] = await Promise.all([
        loadSessions(), loadLevelSlice(), loadDifficulty(), loadCoins(), loadConfig(),
      ]);
      setSessions(s); setLevelSlice(l); setDifficulty(d); setCoins(c); setConfig(cfg);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  const streak      = calculateStreak(sessions);
  const todayCount  = sessionsTodayCount(sessions);
  const totalScore  = getTotalScore(sessions);
  const { levels }  = levelSlice;

  return (
    <div className="min-h-screen bg-paper pb-24 lg:pb-8">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-ink">Your Progress</h1>
          <p className="text-xs text-muted mt-0.5">Keep it up!</p>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center space-y-0.5">
            <p className="text-2xl font-bold text-accent">{totalScore}</p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wide">Total pts</p>
          </div>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center space-y-0.5">
            <p className="flex items-center justify-center gap-1.5 text-2xl font-bold text-ink">
              {streak > 0 ? <><IconStreak />{streak}</> : <span className="text-muted">—</span>}
            </p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wide">Day streak</p>
          </div>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-4 text-center space-y-0.5">
            <p className="flex items-center justify-center gap-1.5 text-2xl font-bold text-ink">
              <IconCoin />{coins.balance}
            </p>
            <p className="text-[10px] text-muted font-medium uppercase tracking-wide">Coins</p>
          </div>
        </div>

        {/* Daily goal */}
        <section className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-ink">Today's goal</h2>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-[4px] bg-rule/40 text-ink">
              {todayCount} / {config.dailyMinimum} done
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: config.dailyMinimum }).map((_, i) => (
              <div key={i} className={`h-2.5 flex-1 rounded-[4px] transition-all ${i < todayCount ? 'bg-accent' : 'bg-rule'}`} />
            ))}
          </div>
          {todayCount > config.dailyMinimum && (
            <p className="text-xs text-muted mt-2 font-medium">
              {todayCount - config.dailyMinimum} extra session{todayCount - config.dailyMinimum > 1 ? 's' : ''} today. Coins earned.
            </p>
          )}
        </section>

        {/* Skill levels */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Skill levels</h2>
          <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
            {(['social', 'nonverbal', 'inference'] as const).map(key => {
              const level  = levels[key];
              const diff   = difficulty[key];
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
                    <span className="text-xs text-muted">Questions:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-[4px] ${DIFF_COLORS[diff]}`}>
                      {DIFF_LABELS[diff]}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Hint tokens */}
        {coins.hintTokens > 0 && (
          <div className="bg-surface border border-rule shadow-[var(--shadow-raised)] rounded-[4px] p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-[4px] bg-accent/10 text-accent flex items-center justify-center shrink-0"><IconHint /></span>
            <div>
              <p className="text-sm font-semibold text-ink">{coins.hintTokens} hint token{coins.hintTokens !== 1 ? 's' : ''} ready</p>
              <p className="text-xs text-muted">Use them during practice to see extra choices.</p>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted mb-3">Recent sessions</h2>
            <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
              {sessions.slice(0, 10).map(s => {
                const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{formatDate(s.date)}</p>
                      <p className="text-xs text-muted">{MODE_LABELS[s.mode]}</p>
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
        ) : (
          <p className="text-center text-sm text-muted py-8">
            No practice sessions yet. Start one from Home!
          </p>
        )}
      </div>
    </div>
  );
}
