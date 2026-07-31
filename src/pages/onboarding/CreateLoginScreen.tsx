import { useState } from 'react';
import { createStudent } from '../../students';
import type { StudentSummary } from '../../students';
import type { ProfileSummary } from '../../profiles';

interface Props {
  profile: ProfileSummary;
  onDone: (student: StudentSummary) => void;
}

export function CreateLoginScreen({ profile, onDone }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [gender, setGender] = useState<'girl' | 'boy' | 'other'>('other');
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    setError('');
    if (!username.trim()) { setError('Pick a username.'); return; }
    if (password.length < 4) { setError('The password needs at least 4 characters.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }

    setCreating(true);
    try {
      const student = await createStudent({ profileId: profile.id, username, password, gender });
      onDone(student);
    } catch (err) {
      console.error('Create login failed:', err);
      setError('The login was not created. That username might already be taken.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-8 w-full max-w-sm space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Profile saved</p>
          <h2 className="text-base font-semibold text-ink">Set up {profile.displayName}'s login</h2>
          <p className="text-sm text-muted mt-1">She will use this username and password to sign in and start practicing.</p>
        </div>

        {error && (
          <p className="flex items-start gap-2 text-sm text-ink bg-paper rounded-[4px] border border-rule px-4 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="mt-0.5 shrink-0">
              <circle cx="12" cy="12" r="2" fill="currentColor" />
            </svg>
            {error}
          </p>
        )}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-muted">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            className="w-full rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-muted">Confirm</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-accent/40" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-muted mb-2">How does she identify? (optional)</p>
          <div className="flex gap-2">
            {([{ v: 'girl', l: 'Girl' }, { v: 'boy', l: 'Boy' }, { v: 'other', l: 'Something else' }] as const).map(o => (
              <button key={o.v} onClick={() => setGender(o.v)}
                className={`flex-1 py-2 rounded-[4px] text-sm border transition-colors
                  ${gender === o.v ? 'bg-accent text-white border-accent font-semibold' : 'border-rule text-ink hover:border-muted'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover disabled:opacity-40">
          {creating ? 'Creating' : 'Create login'}
        </button>
      </div>
    </div>
  );
}
