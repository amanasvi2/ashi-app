import { useEffect, useState } from 'react';
import { loadConfig, loadInterests, saveInterests, updateKidGender } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

const INTEREST_OPTIONS = [
  { id: 'gaming',  label: 'Gaming',      emoji: '🎮' },
  { id: 'animals', label: 'Animals',     emoji: '🐾' },
  { id: 'music',   label: 'Music',       emoji: '🎵' },
  { id: 'comedy',  label: 'Comedy',      emoji: '😂' },
  { id: 'art',     label: 'Art',         emoji: '🎨' },
  { id: 'cooking', label: 'Cooking',     emoji: '🍳' },
  { id: 'sports',  label: 'Sports',      emoji: '⚽' },
  { id: 'science', label: 'Science',     emoji: '🔬' },
  { id: 'crafts',  label: 'DIY & Crafts',emoji: '✂️' },
  { id: 'nature',  label: 'Nature',      emoji: '🌿' },
];

interface Props {
  username: string;
  onClose: () => void;
  onLogout: () => void;
}

export function ProfilePanel({ username, onClose, onLogout }: Props) {
  const [loading, setLoading]   = useState(true);
  const [kidGender, setKidGender] = useState<'girl' | 'boy' | 'other'>('other');
  const [interests, setInterests] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [config, ints] = await Promise.all([loadConfig(), loadInterests()]);
      setKidGender(config.kidGender ?? 'other');
      setInterests(ints);
      setLoading(false);
    })();
  }, []);

  const handleGender = async (gender: 'girl' | 'boy' | 'other') => {
    setKidGender(gender);
    await updateKidGender(gender);
  };

  const toggleInterest = async (id: string) => {
    const next = interests.includes(id) ? interests.filter(x => x !== id) : [...interests, id];
    setInterests(next);
    await saveInterests(next);
  };

  const initial = username[0]?.toUpperCase() ?? '?';

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 md:w-96 bg-white shadow-2xl overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {loading ? <LoadingScreen /> : (
          <div className="flex-1 px-6 py-5 space-y-6">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 text-blue-700 font-bold text-2xl flex items-center justify-center flex-shrink-0">
                {initial}
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900 capitalize">{username}</p>
                <p className="text-xs text-slate-400">Student account</p>
              </div>
            </div>

            {/* Gender / AI partner */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-1">AI conversation partner</p>
              <p className="text-xs text-slate-400 mb-3">This changes whether Alex is a girl or a boy.</p>
              <div className="flex gap-2">
                {([
                  { value: 'girl',  label: 'Girl'           },
                  { value: 'boy',   label: 'Boy'            },
                  { value: 'other', label: 'Either'         },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleGender(opt.value)}
                    className={`flex-1 py-2 rounded-xl text-sm border transition-all
                      ${kidGender === opt.value
                        ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                        : 'border-slate-200 text-slate-600 hover:border-blue-300'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <p className="text-xs font-semibold text-slate-500 mb-3">Video interests</p>
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
          </div>
        )}

        {/* Sign out */}
        <div className="px-6 py-4 border-t border-slate-100">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200
                       text-slate-600 hover:bg-slate-50 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
