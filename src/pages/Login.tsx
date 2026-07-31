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
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-[4px] border border-rule bg-surface px-4 py-2.5 text-sm text-ink
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
    const result = mode === 'signin' ? await signInParent(email, password) : await signUpOwner(email, password, ownerType);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.session) onLogin(result.session);
  };

  return (
    <div className="space-y-4">
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
                className={`flex-1 py-2 rounded-[4px] text-sm border transition-colors
                  ${ownerType === o.v ? 'bg-accent text-white border-accent font-semibold' : 'border-rule text-ink hover:border-muted'}`}
              >
                {o.l}
              </button>
            ))}
          </div>
        </div>
      )}
      {error && (
        <p className="flex items-start gap-2 text-sm text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
      <button
        onClick={handleSubmit}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        disabled={loading || !email.trim() || !password}
        className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        className="w-full text-center text-xs text-muted hover:text-ink transition-colors"
      >
        {mode === 'signin' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </div>
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
    const result = await signInKid(username, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.session) onLogin(result.session);
  };

  return (
    <div className="space-y-4">
      <Field label="Username" id="kid-username" value={username} onChange={setUsername} autoComplete="username" />
      <Field label="Password" id="kid-password" type="password" value={password} onChange={setPassword}
        autoComplete="current-password" />
      {error && (
        <p className="flex items-start gap-2 text-sm text-ink">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          {error}
        </p>
      )}
      <button
        onClick={handleSubmit}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        disabled={loading || !username.trim() || !password}
        className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait' : 'Sign in'}
      </button>
    </div>
  );
}

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [tab, setTab] = useState<'parent' | 'kid'>('kid');

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-paper">
      <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-8 w-full max-w-sm space-y-6">
        <div className="space-y-1.5">
          <p className="flex items-center gap-2 text-2xl font-extrabold text-ink tracking-tight">
            <span className="w-2.5 h-2.5 rounded-[2px] bg-accent" />
            Ashi
          </p>
          <p className="text-xs text-muted">Daily practice understanding stories and people</p>
        </div>

        <div className="flex gap-2 p-1 bg-paper rounded-[4px] border border-rule">
          <button
            onClick={() => setTab('kid')}
            className={`flex-1 py-2 rounded-[4px] text-sm font-medium transition-colors
              ${tab === 'kid' ? 'bg-surface text-ink shadow-[var(--shadow-raised)]' : 'text-muted'}`}
          >
            Student
          </button>
          <button
            onClick={() => setTab('parent')}
            className={`flex-1 py-2 rounded-[4px] text-sm font-medium transition-colors
              ${tab === 'parent' ? 'bg-surface text-ink shadow-[var(--shadow-raised)]' : 'text-muted'}`}
          >
            Parent or clinician
          </button>
        </div>

        {tab === 'kid' ? <KidAuth onLogin={onLogin} /> : <ParentAuth onLogin={onLogin} />}
      </div>
    </div>
  );
}
