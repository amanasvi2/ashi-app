import { PlayLogo,PlayBuddy } from '../design/PlayArt';
import { Brand, JourneyIllustration } from '../design/Brand';
import { useState } from 'react';
import { signInParent, signUpOwner, signInKid } from '../auth';
import type { Session } from '../auth';
import type { OwnerType } from '../ownerCaps';

function Field({ label, id, type = 'text', value, onChange, autoComplete }: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-muted">{label}</label>
      <input
        required id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-rule bg-surface px-4 py-2.5 text-sm text-ink
                   placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-colors"
      />
    </div>
  );
}

function ParentAuth({ onLogin }: { onLogin: (s: Session) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [ownerType, setOwnerType] = useState<OwnerType>('parent');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
    const result = mode === 'signin' ? await signInParent(email, password) : await signUpOwner(email, password, ownerType);
    if (result.error) { setError(result.error); return; }
    if (result.session) onLogin(result.session);
    } catch { setError('Could not connect. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!loading)void handleSubmit();}}>
      <Field label="Email" id="parent-email" type="email" value={email} onChange={setEmail} autoComplete="username" />
      <Field label="Password" id="parent-password" type="password" value={password} onChange={setPassword}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
      {mode === 'signup' && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted">I am a</p>
          <div className="flex gap-2">
            {([{ v: 'parent', l: 'Parent' }, { v: 'clinician', l: 'Clinician or SLP' }] as const).map(o => (
              <button
                key={o.v}
                type="button"
                onClick={() => setOwnerType(o.v)}
                className={`flex-1 py-2 rounded-xl text-sm border transition-colors
                  ${ownerType === o.v ? 'bg-accent text-white border-accent font-semibold' : 'border-rule text-ink hover:border-muted'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !email.trim() || !password}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        type="button"
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </form>
  );
}

function KidAuth({ onLogin }: { onLogin: (s: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
    const result = await signInKid(username, password);
    if (result.error) { setError(result.error); return; }
    if (result.session) onLogin(result.session);
    } catch { setError('Could not connect. Check your connection and try again.'); }
    finally { setLoading(false); }
  };

  return (
    <form className="space-y-4" onSubmit={e=>{e.preventDefault();if(!loading)void handleSubmit();}}>
      <Field label="Username" id="kid-username" value={username} onChange={setUsername} autoComplete="username" />
      <Field label="Password" id="kid-password" type="password" value={password} onChange={setPassword}
        autoComplete="current-password" />
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading || !username.trim() || !password}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-accent text-white hover:bg-accent-hover
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait' : 'Sign in'}
      </button>
    </form>
  );
}

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [tab, setTab] = useState<'parent' | 'kid'>('kid');

  return <main className={`login-page ${tab==='kid'?'kid-zone kid-login':''}`}>
    <header className="login-nav">{tab==='kid'?<PlayLogo/>:<Brand/>}<span>{tab==='kid'?'Find clues. Play your way.':'A little practice, every day.'}</span></header>
    <div className="login-layout"><section className="login-story">{tab==='kid'?<><span className="play-tag">YOUR NEXT QUEST IS WAITING</span><h1>Ready.<br/>Set. <span>Play.</span></h1><p>Find clues. Try new moves. Be you.</p><div className="login-buddy-scene"><PlayBuddy/><span aria-hidden="true" className="login-sticker">LET’S GO!</span></div></>:<><span className="eyebrow">A LITTLE MORE UNDERSTANDING</span><h1>Little moments.<br/><em>Bigger possibilities.</em></h1><p>A space to practice understanding people, finding your words, and feeling ready for everyday life.</p><JourneyIllustration/></>}</section>
    <section className="login-card"><span className="eyebrow">{tab==='kid'?'PLAYER SIGN-IN':'YOUR NEXT SMALL STEP'}</span><h2>{tab==='kid'?'Jump back in.':'Welcome back.'}</h2>{tab==='parent'&&<p className="text-sm text-muted">A little practice can go a long way.</p>}
      <div className="login-role-switch" aria-label="Choose account type"><button aria-pressed={tab==='kid'} onClick={()=>setTab('kid')}>Student</button><button aria-pressed={tab==='parent'} onClick={()=>setTab('parent')}>Parent or clinician</button></div>
      {tab==='kid'?<KidAuth onLogin={onLogin}/>:<ParentAuth onLogin={onLogin}/>}
      <p className="login-privacy">{tab==='kid'?<>Alex is a computer. Your grown-up can read chats.</>:<>Practice with a computer partner.<br/>A grown-up can review conversations.</>}</p>
    </section></div>
    <footer className="login-footer"><span>{tab==='kid'?'Your pace. Your space.':'At your pace. With the support you need.'}</span><span>{tab==='kid'?'Small rounds. Real skills.':'Made for the moments that matter.'}</span></footer>
  </main>;
}
