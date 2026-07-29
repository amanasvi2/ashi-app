import { useState } from 'react';
import { signInParent, signUpParent, signInKid } from '../auth';
import type { Session } from '../auth';

function Field({ label, id, type = 'text', value, onChange, autoComplete }: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; autoComplete?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600">{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-800
                   placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors"
      />
    </div>
  );
}

function ParentAuth({ onLogin }: { onLogin: (s: Session) => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    const result = mode === 'signin' ? await signInParent(email, password) : await signUpParent(email, password);
    setLoading(false);
    if (result.error) { setError(result.error); return; }
    if (result.session) onLogin(result.session);
  };

  return (
    <div className="space-y-4">
      <Field label="Email" id="parent-email" type="email" value={email} onChange={setEmail} autoComplete="username" />
      <Field label="Password" id="parent-password" type="password" value={password} onChange={setPassword}
        autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} />
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        disabled={loading || !email.trim() || !password}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
      </button>
      <button
        onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
        className="w-full text-center text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        {mode === 'signin' ? "New here? Create a parent account" : 'Already have an account? Sign in'}
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
      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        onClick={handleSubmit}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        disabled={loading || !username.trim() || !password}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700
                   disabled:opacity-40 transition-colors"
      >
        {loading ? 'Please wait…' : 'Sign in'}
      </button>
    </div>
  );
}

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [tab, setTab] = useState<'parent' | 'kid'>('kid');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">Ashi</p>
          <p className="text-xs text-slate-400">Daily social skills practice</p>
        </div>

        <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setTab('kid')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === 'kid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Student
          </button>
          <button
            onClick={() => setTab('parent')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors
              ${tab === 'parent' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500'}`}
          >
            Parent
          </button>
        </div>

        {tab === 'kid' ? <KidAuth onLogin={onLogin} /> : <ParentAuth onLogin={onLogin} />}
      </div>
    </div>
  );
}
