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
    if (password.length < 4) { setError('Password needs at least 4 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }

    setCreating(true);
    try {
      const student = await createStudent({ profileId: profile.id, username, password, gender });
      onDone(student);
    } catch (err) {
      console.error('Create login failed:', err);
      setError('Could not create the login — that username might already be taken.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-8 w-full max-w-sm space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-emerald-500 mb-1">Profile saved</p>
          <h2 className="text-base font-semibold text-slate-800">Set up {profile.displayName}'s login</h2>
          <p className="text-sm text-slate-500 mt-1">She'll use this username and password to sign in and start practicing.</p>
        </div>

        {error && <p className="text-sm text-red-500 bg-red-50 rounded-xl px-4 py-2.5">{error}</p>}

        <div className="space-y-1">
          <label className="block text-xs font-medium text-slate-600">Username</label>
          <input value={username} onChange={e => setUsername(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-600">Confirm</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
          </div>
        </div>
        <div>
          <p className="text-xs font-medium text-slate-600 mb-2">How does she identify? (optional)</p>
          <div className="flex gap-2">
            {([{ v: 'girl', l: 'Girl' }, { v: 'boy', l: 'Boy' }, { v: 'other', l: 'Something else' }] as const).map(o => (
              <button key={o.v} onClick={() => setGender(o.v)}
                className={`flex-1 py-2 rounded-xl text-sm border transition-all
                  ${gender === o.v ? 'bg-blue-600 text-white border-blue-600 font-semibold' : 'border-slate-200 text-slate-600'}`}>
                {o.l}
              </button>
            ))}
          </div>
        </div>
        <button onClick={handleCreate} disabled={creating}
          className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-40">
          {creating ? 'Creating…' : "Done! Let's go"}
        </button>
      </div>
    </div>
  );
}
