import { useMemo } from 'react';
import type { SupportLevel, Difficulty } from '../types';
import {
  loadSessions, getTotalScore, calculateStreak,
  sessionsTodayCount, loadConfig, loadLevelSlice, loadDifficulty, loadCoins,
} from '../storage';

const LEVEL_LABELS: Record<SupportLevel, string> = { 2: 'Most help', 1: 'Some help', 0: 'No hints' };
const LEVEL_COLORS: Record<SupportLevel, string> = {
  2: 'text-slate-600 bg-slate-100',
  1: 'text-amber-700 bg-amber-50',
  0: 'text-emerald-700 bg-emerald-50',
};
const DIFF_LABELS: Record<Difficulty, string>  = { 1: 'Easy', 2: 'Medium', 3: 'Hard' };
const DIFF_COLORS: Record<Difficulty, string>  = {
  1: 'text-emerald-700 bg-emerald-50',
  2: 'text-amber-700 bg-amber-50',
  3: 'text-rose-700 bg-rose-50',
};

function LevelPips({ level }: { level: SupportLevel }) {
  const filled = 3 - level;
  return (
    <span className="flex gap-1 items-center">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-2.5 h-2.5 rounded-full ${i < filled ? 'bg-blue-500' : 'bg-slate-200'}`} />
      ))}
    </span>
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
  const sessions   = useMemo(() => loadSessions(), []);
  const levelSlice = useMemo(() => loadLevelSlice(), []);
  const difficulty = useMemo(() => loadDifficulty(), []);
  const coins      = useMemo(() => loadCoins(), []);
  const config     = useMemo(() => loadConfig(), []);

  const streak      = calculateStreak(sessions);
  const todayCount  = sessionsTodayCount(sessions);
  const totalScore  = getTotalScore(sessions);
  const { levels }  = levelSlice;

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">
      <div className="max-w-lg md:max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">Your Progress</h1>
          <p className="text-xs text-slate-400 mt-0.5">Keep it up!</p>
        </div>

        {/* Summary chips */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center space-y-0.5">
            <p className="text-2xl font-bold text-blue-600">{totalScore}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Total pts</p>
          </div>
          <div className={`rounded-2xl border p-4 text-center space-y-0.5 ${streak > 0 ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-100'}`}>
            <p className={`text-2xl font-bold ${streak > 0 ? 'text-amber-600' : 'text-slate-300'}`}>
              {streak > 0 ? `🔥 ${streak}` : '—'}
            </p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">{streak === 1 ? 'Day streak' : 'Day streak'}</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 p-4 text-center space-y-0.5">
            <p className="text-2xl font-bold text-amber-500">⭐ {coins.balance}</p>
            <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">Coins</p>
          </div>
        </div>

        {/* Daily goal */}
        <section className="bg-white rounded-2xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-slate-800">Today's goal</h2>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
              ${todayCount >= config.dailyMinimum ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {todayCount} / {config.dailyMinimum} done
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: config.dailyMinimum }).map((_, i) => (
              <div key={i} className={`h-2.5 flex-1 rounded-full transition-all ${i < todayCount ? 'bg-blue-500' : 'bg-slate-200'}`} />
            ))}
          </div>
          {todayCount > config.dailyMinimum && (
            <p className="text-xs text-emerald-600 mt-2 font-medium">
              +{todayCount - config.dailyMinimum} extra session{todayCount - config.dailyMinimum > 1 ? 's' : ''} — coins earned!
            </p>
          )}
        </section>

        {/* Skill levels */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Skill levels</h2>
          <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
            {(['social', 'nonverbal', 'inference'] as const).map(key => {
              const labels = { social: 'Social Problems', nonverbal: 'Nonverbal Cues', inference: 'Text Inference' };
              const level  = levels[key];
              const diff   = difficulty[key];
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
                    <span className="text-xs text-slate-400">Questions:</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${DIFF_COLORS[diff]}`}>
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
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex items-center gap-3">
            <span className="text-2xl">🔮</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">{coins.hintTokens} hint token{coins.hintTokens !== 1 ? 's' : ''} ready</p>
              <p className="text-xs text-blue-600">Use them during practice to see extra choices.</p>
            </div>
          </div>
        )}

        {/* Recent sessions */}
        {sessions.length > 0 ? (
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Recent sessions</h2>
            <div className="bg-white rounded-2xl border border-slate-100 divide-y divide-slate-50">
              {sessions.slice(0, 10).map(s => {
                const pct = s.maxScore > 0 ? Math.round((s.score / s.maxScore) * 100) : 0;
                return (
                  <div key={s.id} className="flex items-center justify-between px-5 py-3.5">
                    <div>
                      <p className="text-sm font-medium text-slate-700">{formatDate(s.date)}</p>
                      <p className="text-xs text-slate-400">{MODE_LABELS[s.mode]}</p>
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
        ) : (
          <p className="text-center text-sm text-slate-400 py-8">
            No practice sessions yet. Start one from Home!
          </p>
        )}
      </div>
    </div>
  );
}
