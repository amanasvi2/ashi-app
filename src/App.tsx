import { useEffect, useState } from 'react';
import type { SessionMode } from './types';
import { getSession, signOut } from './auth';
import type { Session } from './auth';
import { getMyStudent } from './students';
import type { StudentSummary } from './students';
import { loadLevelSlice, loadDifficulty } from './storage';
import { Login } from './pages/Login';
import { OnboardingWizard } from './pages/onboarding/OnboardingWizard';
import { Home } from './pages/Home';
import { Practice } from './pages/Practice';
import { Conversation } from './pages/Conversation';
import { Journal } from './pages/Journal';
import { ProgressPage } from './pages/ProgressPage';
import { RewardsPage } from './pages/RewardsPage';
import { ParentDashboard } from './pages/ParentDashboard';
import { ProfilePanel } from './pages/ProfilePanel';
import { JournalFAB } from './components/JournalFAB';
import { BottomNav } from './components/BottomNav';
import type { MainTab } from './components/BottomNav';
import type { LevelSlice } from './levelReducer';
import type { DifficultyState } from './types';

type Page =
  | { tag: 'home' }
  | { tag: 'practice'; mode: SessionMode; levelSlice: LevelSlice; difficulty: DifficultyState }
  | { tag: 'conversation' }
  | { tag: 'journal' };

const TAB_LABELS: { key: MainTab; label: string }[] = [
  { key: 'home',     label: 'Home'     },
  { key: 'progress', label: 'Progress' },
  { key: 'rewards',  label: 'Rewards'  },
];

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <p className="text-sm text-slate-400">Loading…</p>
    </div>
  );
}

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [studentLoading, setStudentLoading] = useState(false);
  const [page, setPage]       = useState<Page>({ tag: 'home' });
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    getSession().then(s => { setSessionState(s); setAuthLoading(false); });
  }, []);

  useEffect(() => {
    if (session?.role !== 'parent') { setStudent(null); return; }
    setStudentLoading(true);
    getMyStudent(session.userId).then(s => { setStudent(s); setStudentLoading(false); });
  }, [session]);

  const handleLogin = (s: Session) => {
    setSessionState(s);
    setPage({ tag: 'home' });
    setMainTab('home');
  };

  const handleLogout = async () => {
    await signOut();
    setSessionState(null);
    setStudent(null);
    setPage({ tag: 'home' });
    setMainTab('home');
  };

  if (authLoading) return <LoadingScreen />;

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!session) return <Login onLogin={handleLogin} />;

  // ── Parent view ───────────────────────────────────────────────────────────
  if (session.role === 'parent') {
    if (studentLoading) return <LoadingScreen />;
    if (!student) return <OnboardingWizard parentId={session.userId} onDone={setStudent} />;
    return <ParentDashboard onLogout={handleLogout} student={student} />;
  }

  // ── Kid: full-screen pages (no nav) ───────────────────────────────────────
  if (page.tag === 'practice') {
    return (
      <Practice
        mode={page.mode}
        initialLevelSlice={page.levelSlice}
        initialDifficulty={page.difficulty}
        onExit={() => setPage({ tag: 'home' })}
        onComplete={() => setPage({ tag: 'home' })}
      />
    );
  }
  if (page.tag === 'conversation') return <Conversation onBack={() => setPage({ tag: 'home' })} />;
  if (page.tag === 'journal')      return <Journal onBack={() => setPage({ tag: 'home' })} />;

  // ── Kid: main tabbed view ─────────────────────────────────────────────────
  const initial = session.username[0]?.toUpperCase() ?? '?';

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Desktop top nav */}
      <nav className="hidden lg:flex fixed top-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm
                      border-b border-slate-100 h-14 items-center px-8 gap-8">
        <span className="text-sm font-bold text-blue-600 shrink-0">Ashi</span>
        <div className="flex gap-1">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors
                ${mainTab === key ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:text-slate-700'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowProfile(true)}
          className="ml-auto w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm
                     flex items-center justify-center hover:bg-blue-200 transition-colors"
        >
          {initial}
        </button>
      </nav>

      {/* Page content */}
      <div className="lg:pt-14">
        {mainTab === 'home'     && (
          <Home
            username={session.username}
            onStart={(mode: SessionMode) =>
              setPage({ tag: 'practice', mode, levelSlice: loadLevelSlice(), difficulty: loadDifficulty() })
            }
            onConversation={() => setPage({ tag: 'conversation' })}
            onLogout={handleLogout}
            onOpenProfile={() => setShowProfile(true)}
          />
        )}
        {mainTab === 'progress' && <ProgressPage />}
        {mainTab === 'rewards'  && <RewardsPage />}
      </div>

      <JournalFAB onOpen={() => setPage({ tag: 'journal' })} />
      <BottomNav active={mainTab} onChange={setMainTab} />

      {showProfile && (
        <ProfilePanel
          username={session.username}
          onClose={() => setShowProfile(false)}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}
