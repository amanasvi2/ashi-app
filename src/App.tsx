import { useEffect, useState } from 'react';
import type { SessionMode } from './types';
import { getSession, signOut } from './auth';
import type { Session } from './auth';
import { getMyStudent } from './students';
import type { StudentSummary } from './students';
import { getMyProfile } from './profiles';
import type { ProfileSummary } from './profiles';
import { loadLevelSlice, loadDifficulty } from './storage';
import { LoadingScreen } from './components/LoadingScreen';
import { Login } from './pages/Login';
import { IntakeFlow } from './pages/onboarding/IntakeFlow';
import { CreateLoginScreen } from './pages/onboarding/CreateLoginScreen';
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

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [student, setStudent] = useState<StudentSummary | null>(null);
  const [parentDataLoading, setParentDataLoading] = useState(false);
  const [page, setPage]       = useState<Page>({ tag: 'home' });
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    getSession().then(s => { setSessionState(s); setAuthLoading(false); });
  }, []);

  useEffect(() => {
    if (session?.role !== 'parent') { setProfile(null); setStudent(null); return; }
    setParentDataLoading(true);
    (async () => {
      const p = await getMyProfile(session.userId);
      setProfile(p);
      setStudent(p?.studentId ? await getMyStudent(session.userId) : null);
      setParentDataLoading(false);
    })();
  }, [session]);

  const handleLogin = (s: Session) => {
    setSessionState(s);
    setPage({ tag: 'home' });
    setMainTab('home');
  };

  const handleStart = async (mode: SessionMode) => {
    const [levelSlice, difficulty] = await Promise.all([loadLevelSlice(), loadDifficulty()]);
    setPage({ tag: 'practice', mode, levelSlice, difficulty });
  };

  const handleLogout = async () => {
    await signOut();
    setSessionState(null);
    setProfile(null);
    setStudent(null);
    setPage({ tag: 'home' });
    setMainTab('home');
  };

  if (authLoading) return <LoadingScreen />;

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!session) return <Login onLogin={handleLogin} />;

  // ── Parent view ───────────────────────────────────────────────────────────
  if (session.role === 'parent') {
    if (parentDataLoading) return <LoadingScreen />;
    if (!profile) return <IntakeFlow onDone={setProfile} />;
    if (!student) {
      return (
        <CreateLoginScreen
          profile={profile}
          onDone={s => { setStudent(s); setProfile(p => (p ? { ...p, studentId: s.id } : p)); }}
        />
      );
    }
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
            onStart={handleStart}
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
