import { useEffect, useState } from 'react';
import type { SessionMode, SessionRecord, ParentConfig, CoinsState } from '../types';
import { loadSessions, calculateStreak, sessionsTodayCount, loadConfig, loadCoins, journalWrittenToday } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconMixed() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/>
      <rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>
    </svg>
  );
}
function IconSocial() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconNonverbal() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/>
      <line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/>
    </svg>
  );
}
function IconInference() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/>
      <polyline points="3 6 4 7 6 5"/><polyline points="3 12 4 13 6 11"/><polyline points="3 18 4 19 6 17"/>
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  );
}
function IconChevron() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  );
}

// ── Mode card ─────────────────────────────────────────────────────────────────

const MODE_CONFIG: { mode: SessionMode; label: string; description: string; icon: React.ReactNode }[] = [
  { mode: 'mixed',     label: 'Mixed',        description: 'All three types',         icon: <IconMixed /> },
  { mode: 'social',    label: 'Social Skills', description: 'What to do?',             icon: <IconSocial /> },
  { mode: 'nonverbal', label: 'Body Language', description: 'What does it mean?',      icon: <IconNonverbal /> },
  { mode: 'inference', label: 'Reading Clues', description: 'Find the hidden meaning', icon: <IconInference /> },
];

function ModeCard({ mode, label, description, icon, onStart }: {
  mode: SessionMode; label: string; description: string;
  icon: React.ReactNode; onStart: (m: SessionMode) => void;
}) {
  return (
    <button
      onClick={() => onStart(mode)}
      className="flex items-center gap-3.5 px-4 py-4 bg-white rounded-2xl border border-slate-200/70 text-left w-full
                 shadow-[0_1px_2px_rgba(0,0,0,0.03)]
                 hover:border-blue-300 hover:bg-blue-50/30 hover:shadow-[0_4px_16px_-8px_rgba(23,50,58,0.25)]
                 active:scale-[0.98] transition-all duration-150"
    >
      <span className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{description}</p>
      </div>
      <span className="text-slate-300 shrink-0"><IconChevron /></span>
    </button>
  );
}

// ── Home ──────────────────────────────────────────────────────────────────────

interface Props {
  username: string;
  onStart: (mode: SessionMode) => void;
  onConversation: () => void;
  onLogout: () => void;
  onOpenProfile: () => void;
}

export function Home({ username, onStart, onConversation, onOpenProfile }: Props) {
  const [loading, setLoading]   = useState(true);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [config, setConfig]     = useState<ParentConfig>({ dailyMinimum: 1 });
  const [coins, setCoins]       = useState<CoinsState>({ balance: 0, totalEarned: 0, hintTokens: 0 });
  const [journalDone, setJournalDone] = useState(false);

  useEffect(() => {
    (async () => {
      const [s, c, co, j] = await Promise.all([loadSessions(), loadConfig(), loadCoins(), journalWrittenToday()]);
      setSessions(s); setConfig(c); setCoins(co); setJournalDone(j);
      setLoading(false);
    })();
  }, []);

  if (loading) return <LoadingScreen />;

  const streak      = calculateStreak(sessions);
  const todayCount  = sessionsTodayCount(sessions);
  const goalMet     = todayCount >= config.dailyMinimum;

  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-slate-50 pb-24 lg:pb-8">
      <div className="max-w-lg md:max-w-2xl lg:max-w-3xl mx-auto px-4 md:px-6 lg:px-8 py-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight capitalize">{username}</h1>
            <p className="text-xs text-slate-400 mt-0.5">
              {goalMet ? 'Goal done for today' : `${todayCount} of ${config.dailyMinimum} sessions done`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {coins.balance > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-50 px-2.5 py-1.5 rounded-full">
                ⭐ {coins.balance}
              </span>
            )}
            {streak > 0 && (
              <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-full">{streak}d streak</span>
            )}
            <button
              onClick={onOpenProfile}
              className="lg:hidden w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm
                         flex items-center justify-center hover:bg-blue-200 transition-colors"
            >
              {initial}
            </button>
          </div>
        </div>

        {/* Daily goal bar */}
        <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] px-5 py-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-slate-700">Today's goal</p>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
              ${goalMet ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
              {todayCount} / {config.dailyMinimum} done
            </span>
          </div>
          <div className="flex gap-2">
            {Array.from({ length: config.dailyMinimum }).map((_, i) => (
              <div key={i} className={`h-2 flex-1 rounded-full transition-all ${i < todayCount ? 'bg-blue-500' : 'bg-slate-100'}`} />
            ))}
          </div>
          {todayCount > config.dailyMinimum && (
            <p className="text-xs text-amber-600 font-medium mt-2">
              {todayCount - config.dailyMinimum} extra — coins earned!
            </p>
          )}
          {journalDone && (
            <p className="text-xs text-emerald-600 font-medium mt-2">Journal written today</p>
          )}
        </div>

        {/* Practice sessions */}
        <section>
          <h2 className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-3">Start a session</h2>
          <div className="space-y-2">
            {MODE_CONFIG.map(cfg => (
              <ModeCard key={cfg.mode} {...cfg} onStart={onStart} />
            ))}
          </div>
        </section>

        {/* Talk with Alex */}
        <section className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(0,0,0,0.03)] p-5">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-base shrink-0">
              A
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">Talk with Alex</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">
                Practice a real back-and-forth conversation. Get feedback when you're done.
              </p>
            </div>
          </div>
          <button
            onClick={onConversation}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white
                       hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            <IconChat />
            Start a conversation
          </button>
        </section>

      </div>
    </div>
  );
}
