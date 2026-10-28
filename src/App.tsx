import {Landing} from './public/Landing';
import {StudentLanguage} from './language/ChildLanguage';
import { PlayLogo } from './design/PlayArt';
import { useEffect, useState } from 'react';
import type { SessionMode } from './types';
import { getSession, signOut } from './auth';
import type { Session } from './auth';
import { listMyStudents } from './students';
import type { StudentSummary } from './students';
import { listMyProfiles, getMyOwnerType } from './profiles';
import type { ProfileSummary } from './profiles';
import { STUDENT_CAP, type OwnerType } from './ownerCaps';
import { loadLevelSlice, loadDifficulty } from './storage';
import { LoadingScreen, LoadFailure } from './components/LoadingScreen';
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
import { StudentRoster } from './pages/StudentRoster';
import { ProfilePanel } from './pages/ProfilePanel';
import { JournalFAB } from './components/JournalFAB';
import { BottomNav } from './components/BottomNav';
import type { MainTab } from './components/BottomNav';
import type { LevelSlice } from './adaptiveEngine';
import type { DifficultyState } from './types';
import { CarryoverWorkspace } from './carryover/Workspace';

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
  const [startupFailed,setStartupFailed]=useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSessionState] = useState<Session | null>(null);
  const [profiles, setProfiles] = useState<ProfileSummary[]>([]);
  const [students, setStudents] = useState<StudentSummary[]>([]);
  const [ownerType, setOwnerType] = useState<OwnerType>('parent');
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  // Non-null whenever a profile needs its login created — either the very
  // first student (forced, nothing else to render yet), the one just
  // created via "Add another student," or one the owner explicitly chose
  // to finish setting up from the switcher/roster's banner.
  const [pendingLoginProfile, setPendingLoginProfile] = useState<ProfileSummary | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);
  const [ownerLoadedFor,setOwnerLoadedFor]=useState<string|null>(null);
  const [parentDataLoading, setParentDataLoading] = useState(false);
  const [page, setPage]       = useState<Page>({ tag: 'home' });
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [showProfile, setShowProfile] = useState(false);
  const [carryoverStudent, setCarryoverStudent] = useState<{id:string;name:string}|null>(null);

  useEffect(() => {
    getSession().then(s => { setSessionState(s); setAuthLoading(false); }).catch(()=>{setStartupFailed(true);setAuthLoading(false);});
  }, []);

  useEffect(() => {
    if (session?.role !== 'parent') {
      setProfiles([]); setStudents([]); setSelectedStudentId(null); setPendingLoginProfile(null);
      return;
    }
    let active=true;
    setParentDataLoading(true);
    (async () => {
      const [profs, studs, ot] = await Promise.all([
        listMyProfiles(session.userId),
        listMyStudents(session.userId),
        getMyOwnerType(session.userId),
      ]);
      if(!active)return;
      setOwnerLoadedFor(session.userId);
      setProfiles(profs);
      setStudents(studs);
      setOwnerType(ot);
      // Nothing to show yet — force the (oldest) incomplete profile's login
      // screen, same as the old single-student "no student yet" case.
      if (studs.length === 0 && profs.length > 0) setPendingLoginProfile(profs[0]);
      // A parent lands straight on their (first) kid's dashboard; a
      // clinician lands on the roster (selectedStudentId stays null).
      if (ot === 'parent' && studs.length > 0) setSelectedStudentId(studs[0].id);
      setParentDataLoading(false);
    })().catch(()=>{if(active){setStartupFailed(true);setParentDataLoading(false);}});
    return()=>{active=false;};
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
    setProfiles([]);
    setStudents([]);
    setSelectedStudentId(null);
    setPendingLoginProfile(null);
    setAddingStudent(false);
    setPage({ tag: 'home' });
    setMainTab('home');
  };

  if(startupFailed)return <LoadFailure/>;
  if (authLoading) return <LoadingScreen />;

  // ── Not logged in ─────────────────────────────────────────────────────────
  if (!session) return window.location.pathname === '/login' ? <Login onLogin={handleLogin} /> : <Landing/>;

  if (carryoverStudent) {const workspace=<CarryoverWorkspace key={carryoverStudent.id} studentId={carryoverStudent.id}
    studentName={carryoverStudent.name} owner={session.role==='parent'} onBack={()=>setCarryoverStudent(null)}/>;return session.role==='kid'?<StudentLanguage studentId={session.userId}>{workspace}</StudentLanguage>:workspace;}

  // ── Parent / clinician view ─────────────────────────────────────────────
  if (session.role === 'parent') {
    if (parentDataLoading||ownerLoadedFor!==session.userId) return <LoadingScreen />;

    if (profiles.length === 0 || addingStudent) {
      return (
        <IntakeFlow
          onDone={p => {
            setProfiles(prev => [...prev, p]);
            setAddingStudent(false);
            setPendingLoginProfile(p);
          }}
        />
      );
    }

    if (pendingLoginProfile) {
      return (
        <CreateLoginScreen
          profile={pendingLoginProfile}
          onDone={s => {
            setStudents(prev => [...prev, s]);
            setProfiles(prev => prev.map(p => (p.id === pendingLoginProfile.id ? { ...p, studentId: s.id } : p)));
            setPendingLoginProfile(null);
            setSelectedStudentId(s.id);
          }}
        />
      );
    }

    // Shouldn't happen (the effect above forces pendingLoginProfile whenever
    // there's no student yet), but keeps this branch honest rather than
    // rendering the dashboard with an undefined student.
    if (students.length === 0) return <LoadingScreen />;

    const incompleteProfile = profiles.find(p => !p.studentId) ?? null;
    const atCap = profiles.length >= STUDENT_CAP[ownerType];

    if (ownerType === 'clinician' && selectedStudentId === null) {
      return (
        <StudentRoster
          students={students}
          incompleteProfile={incompleteProfile}
          canAddStudent={!atCap}
          onSelectStudent={setSelectedStudentId}
          onFinishSetup={setPendingLoginProfile}
          onAddStudent={() => setAddingStudent(true)}
          onLogout={handleLogout}
        />
      );
    }

    const currentStudent = students.find(s => s.id === selectedStudentId) ?? students[0];
    return (
      <ParentDashboard key={currentStudent.id}
        onCarryover={()=>setCarryoverStudent({id:currentStudent.id,name:currentStudent.displayName})}
        onLogout={handleLogout}
        student={currentStudent}
        students={ownerType === 'parent' && students.length > 1 ? students : undefined}
        onSwitchStudent={setSelectedStudentId}
        onAddStudent={!atCap ? () => setAddingStudent(true) : undefined}
        onBackToRoster={ownerType === 'clinician' ? () => setSelectedStudentId(null) : undefined}
        incompleteProfile={incompleteProfile}
        onFinishSetup={setPendingLoginProfile}
      />
    );
  }

  // ── Kid: full-screen pages (no nav) ───────────────────────────────────────
  if (page.tag === 'practice') {
    return (
      <StudentLanguage studentId={session.userId}><div className="kid-zone kid-screen"><Practice
        mode={page.mode}
        initialLevelSlice={page.levelSlice}
        initialDifficulty={page.difficulty}
        onExit={() => setPage({ tag: 'home' })}
        onComplete={() => setPage({ tag: 'home' })}
      /></div></StudentLanguage>
    );
  }
  if (page.tag === 'conversation') return <StudentLanguage studentId={session.userId}><div className="kid-zone kid-screen"><Conversation onBack={() => setPage({ tag: 'home' })} /></div></StudentLanguage>;
  if (page.tag === 'journal') return <StudentLanguage studentId={session.userId}><div className="kid-zone kid-screen"><Journal onBack={() => setPage({ tag: 'home' })} /></div></StudentLanguage>;

  // ── Kid: main tabbed view ─────────────────────────────────────────────────
  const initial = session.username[0]?.toUpperCase() ?? '?';

  return (
    <StudentLanguage studentId={session.userId}><div className="kid-zone kid-app min-h-screen bg-paper">

      {/* Desktop top nav */}
      <nav className="kid-top-nav hidden lg:flex fixed top-0 left-0 right-0 z-30 bg-surface/95 backdrop-blur-sm
                      border-b border-rule h-14 items-center px-8 gap-8">
        <span className="flex items-center gap-2 text-sm font-bold text-ink shrink-0">
          <PlayLogo/>
        </span>
        <div className="flex gap-1">
          {TAB_LABELS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setMainTab(key)}
              className={`px-4 py-1.5 rounded-xl text-sm font-medium transition-colors
                ${mainTab === key ? 'bg-accent/10 text-accent' : 'text-muted hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <button
          aria-label="Open profile"
          onClick={() => setShowProfile(true)}
          className="ml-auto w-8 h-8 rounded-xl bg-accent/10 text-accent font-bold text-sm
                     flex items-center justify-center hover:bg-accent/20 transition-colors"
        >
          {initial}
        </button>
      </nav>

      {/* Page content */}
      <div className="lg:pt-14">
        {mainTab === 'home'     && (
          <Home
            onCarryover={()=>setCarryoverStudent({id:session.userId,name:session.username})}
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
    </div></StudentLanguage>
  );
}
