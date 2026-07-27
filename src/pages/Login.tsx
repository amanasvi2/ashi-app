import { useState } from 'react';
import { hasCredentials, setupCredentials, validateLogin, setSession } from '../auth';
import type { Session } from '../auth';
import { saveConfig } from '../storage';
import type { ParentConfig } from '../types';

const INTEREST_OPTIONS = [
  { id: 'gaming',   label: 'Gaming',      emoji: '🎮' },
  { id: 'animals',  label: 'Animals',     emoji: '🐾' },
  { id: 'music',    label: 'Music',       emoji: '🎵' },
  { id: 'comedy',   label: 'Comedy',      emoji: '😂' },
  { id: 'art',      label: 'Art',         emoji: '🎨' },
  { id: 'cooking',  label: 'Cooking',     emoji: '🍳' },
  { id: 'sports',   label: 'Sports',      emoji: '⚽' },
  { id: 'science',  label: 'Science',     emoji: '🔬' },
  { id: 'crafts',   label: 'DIY & Crafts',emoji: '✂️' },
  { id: 'nature',   label: 'Nature',      emoji: '🌿' },
];

// ── Shared field component ────────────────────────────────────────────────────

function Field({ label, id, type = 'text', value, onChange, error }: {
  label: string; id: string; type?: string;
  value: string; onChange: (v: string) => void; error?: string;
}) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-xs font-medium text-slate-600">{label}</label>
      <input
        id={id} type={type} value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={type === 'password' ? 'current-password' : 'username'}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-800 placeholder:text-slate-300
                    focus:outline-none focus:ring-2 focus:ring-blue-300 transition-colors
                    ${error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}

// ── Setup (first run, 3 steps) ────────────────────────────────────────────────

function SetupForm({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Student account
  const [kidUser, setKidUser]       = useState('');
  const [kidPass, setKidPass]       = useState('');
  const [kidConfirm, setKidConfirm] = useState('');
  const [interests, setInterests]   = useState<string[]>([]);
  const [gender, setGender]         = useState<'girl' | 'boy' | 'other'>('other');

  // Step 2: Parent account + config
  const [parentUser, setParentUser]       = useState('');
  const [parentPass, setParentPass]       = useState('');
  const [parentConfirm, setParentConfirm] = useState('');
  const [dailyMin, setDailyMin]           = useState(1);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const toggleInterest = (id: string) =>
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!kidUser.trim()) e.kidUser = 'Required';
    if (kidPass.length < 4) e.kidPass = 'At least 4 characters';
    if (kidPass !== kidConfirm) e.kidConfirm = 'Passwords do not match';
    return e;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!parentUser.trim()) e.parentUser = 'Required';
    if (parentUser.trim().toLowerCase() === kidUser.trim().toLowerCase())
      e.parentUser = 'Must be different from the student username';
    if (parentPass.length < 4) e.parentPass = 'At least 4 characters';
    if (parentPass !== parentConfirm) e.parentConfirm = 'Passwords do not match';
    return e;
  };

  const handleStep1 = () => {
    const e = validateStep1();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep(2);
  };

  const handleStep2 = () => {
    const e = validateStep2();
    if (Object.keys(e).length) { setErrors(e); return; }
    setErrors({});
    setStep(3);
  };

  const handleFinish = () => {
    setupCredentials(kidUser, kidPass, parentUser, parentPass);
    const config: ParentConfig = { dailyMinimum: dailyMin, interests, customRewards: [], kidGender: gender };
    saveConfig(config);
    onDone();
  };

  const stepLabels = ['Student account', 'Parent account', 'Daily goal'];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Set up your accounts</h2>
        <p className="text-sm text-slate-500 mt-0.5">Step {step} of 3</p>
        {/* Progress pips */}
        <div className="flex gap-2 mt-3">
          {[1, 2, 3].map(s => (
            <div key={s} className={`h-1.5 flex-1 rounded-full transition-colors ${s <= step ? 'bg-blue-500' : 'bg-slate-200'}`} />
          ))}
        </div>
      </div>

      {/* Step 1: Student */}
      {step === 1 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500">Student account</p>
          <Field label="Username" id="kid-user" value={kidUser} onChange={v => { setKidUser(v); setErrors({}); }} error={errors.kidUser} />
          <Field label="Password" id="kid-pass" type="password" value={kidPass} onChange={v => { setKidPass(v); setErrors({}); }} error={errors.kidPass} />
          <Field label="Confirm password" id="kid-confirm" type="password" value={kidConfirm} onChange={v => { setKidConfirm(v); setErrors({}); }} error={errors.kidConfirm} />

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">What videos does she like? (pick any)</p>
            <div className="flex flex-wrap gap-2">
              {INTEREST_OPTIONS.map(opt => (
                <button
                  key={opt.id}
                  onClick={() => toggleInterest(opt.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all
                    ${interests.includes(opt.id)
                      ? 'bg-blue-100 border-blue-400 text-blue-700 font-medium'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-600 mb-2">How do you identify? (optional)</p>
            <div className="flex gap-2">
              {([
                { value: 'girl',  label: 'Girl'           },
                { value: 'boy',   label: 'Boy'            },
                { value: 'other', label: 'Something else' },
              ] as const).map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setGender(opt.value)}
                  className={`flex-1 py-2 rounded-xl text-sm border transition-all
                    ${gender === opt.value
                      ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={handleStep1}
            className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Parent */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Parent account</p>
          <Field label="Username" id="par-user" value={parentUser} onChange={v => { setParentUser(v); setErrors({}); }} error={errors.parentUser} />
          <Field label="Password" id="par-pass" type="password" value={parentPass} onChange={v => { setParentPass(v); setErrors({}); }} error={errors.parentPass} />
          <Field label="Confirm password" id="par-confirm" type="password" value={parentConfirm} onChange={v => { setParentConfirm(v); setErrors({}); }} error={errors.parentConfirm} />

          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              ← Back
            </button>
            <button onClick={handleStep2}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Daily goal */}
      {step === 3 && (
        <div className="space-y-5">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Daily goal</p>
          <div>
            <p className="text-sm font-medium text-slate-700 mb-1">
              How many practice sessions per day?
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Extra sessions beyond this goal earn ⭐ coins for rewards.
            </p>
            <div className="flex gap-2">
              {[1, 2, 3].map(n => (
                <button
                  key={n}
                  onClick={() => setDailyMin(n)}
                  className={`flex-1 py-3 rounded-xl text-sm font-semibold border transition-all
                    ${dailyMin === n
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                >
                  {n} {n === 1 ? 'session' : 'sessions'}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-700 space-y-1">
            <p className="font-medium">How coins work:</p>
            <ul className="text-xs space-y-0.5 text-blue-600">
              <li>• Complete your daily goal → no coins (just progress!)</li>
              <li>• Extra sessions beyond the goal → ⭐ 10 coins each</li>
              <li>• Write in the journal → ⭐ 3 coins</li>
              <li>• Perfect score on a session → ⭐ 5 bonus coins</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl text-sm font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
              ← Back
            </button>
            <button onClick={handleFinish}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
              Done! Let's go
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Login ─────────────────────────────────────────────────────────────────────

function LoginForm({ onLogin }: { onLogin: (session: Session) => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = () => {
    const role = validateLogin(username, password);
    if (!role) { setError('That username or password is not right.'); return; }
    const session: Session = { role, username: username.trim().toLowerCase() };
    setSession(session);
    onLogin(session);
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold text-slate-800">Sign in</h2>
        <p className="text-sm text-slate-500 mt-0.5">Enter your username and password.</p>
      </div>
      <Field label="Username" id="username" value={username} onChange={v => { setUsername(v); setError(''); }} />
      <Field label="Password" id="password" type="password" value={password}
        onChange={v => { setPassword(v); setError(''); }} error={error} />
      <button
        onClick={handleSubmit}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
        Sign in
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function Login({ onLogin }: { onLogin: (session: Session) => void }) {
  const [setupDone, setSetupDone] = useState(hasCredentials());
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-sm space-y-6">
        <div className="space-y-1">
          <p className="text-2xl font-bold text-slate-900">Ashi</p>
          <p className="text-xs text-slate-400">Daily social skills practice</p>
        </div>
        {!setupDone ? <SetupForm onDone={() => setSetupDone(true)} /> : <LoginForm onLogin={onLogin} />}
      </div>
    </div>
  );
}
