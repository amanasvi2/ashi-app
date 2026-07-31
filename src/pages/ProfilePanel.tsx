import { useEffect, useState } from 'react';
import { loadConfig, loadInterests, saveInterests, updateKidGender } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

function IconGaming() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1"/><circle cx="17" cy="13" r="1"/><path d="M6 9h12l1.5 9H4.5L6 9z"/></svg>;
}
function IconAnimals() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="9" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="20" cy="10" r="2"/><path d="M8 17c-1.5-3 1-6 5-6s6.5 3 5 6c-1 2-3 3-5 3s-4-1-5-3z"/></svg>;
}
function IconMusic() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}
function IconComedy() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="8" y1="9" x2="8.01" y2="9"/><line x1="12" y1="9" x2="12.01" y2="9"/><line x1="16" y1="9" x2="16.01" y2="9"/></svg>;
}
function IconArt() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a10 10 0 1 0 4 19.2c1-.4 1-1.8 0-2.3-.6-.3-1-.9-1-1.6 0-1 .8-1.8 1.8-1.8H18a4 4 0 0 0 4-4c0-5-4.5-9.5-10-9.5z"/><circle cx="7.5" cy="12" r="1"/><circle cx="9.5" cy="8" r="1"/><circle cx="14.5" cy="7" r="1"/></svg>;
}
function IconCooking() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="10" cy="13" r="7"/><line x1="17" y1="13" x2="22" y2="13"/></svg>;
}
function IconSports() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M4.5 4.5c3.5 3.5 5.5 8 5.5 15.5"/><path d="M19.5 4.5c-3.5 3.5-5.5 8-5.5 15.5"/><line x1="3" y1="12" x2="21" y2="12"/></svg>;
}
function IconScience() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 2v6L4 20a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2L15 8V2"/><line x1="9" y1="2" x2="15" y2="2"/><line x1="7" y1="15" x2="17" y2="15"/></svg>;
}
function IconCrafts() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.1" y2="15.9"/><line x1="14.5" y1="14.5" x2="20" y2="20"/><line x1="8.1" y1="8.1" x2="12" y2="12"/></svg>;
}
function IconNature() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10Z"/><path d="M2 21c0-3 1.9-5.4 5.1-6C9.5 14.5 11 13.5 11 12"/></svg>;
}

const INTEREST_OPTIONS = [
  { id: 'gaming',  label: 'Gaming',       icon: <IconGaming /> },
  { id: 'animals', label: 'Animals',      icon: <IconAnimals /> },
  { id: 'music',   label: 'Music',        icon: <IconMusic /> },
  { id: 'comedy',  label: 'Comedy',       icon: <IconComedy /> },
  { id: 'art',     label: 'Art',          icon: <IconArt /> },
  { id: 'cooking', label: 'Cooking',      icon: <IconCooking /> },
  { id: 'sports',  label: 'Sports',       icon: <IconSports /> },
  { id: 'science', label: 'Science',      icon: <IconScience /> },
  { id: 'crafts',  label: 'DIY & Crafts', icon: <IconCrafts /> },
  { id: 'nature',  label: 'Nature',       icon: <IconNature /> },
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
        className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 bottom-0 z-50 w-80 md:w-96 bg-surface shadow-[var(--shadow-raised)] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-rule">
          <h2 className="text-base font-semibold text-ink">Profile & Settings</h2>
          <button
            onClick={onClose}
            className="text-muted hover:text-ink transition-colors p-1"
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
              <div className="w-16 h-16 rounded-[4px] bg-accent/10 text-accent font-bold text-2xl flex items-center justify-center flex-shrink-0">
                {initial}
              </div>
              <div>
                <p className="text-lg font-bold text-ink capitalize">{username}</p>
                <p className="text-xs text-muted">Student account</p>
              </div>
            </div>

            {/* Gender / AI partner */}
            <div>
              <p className="text-xs font-semibold text-muted mb-1">AI conversation partner</p>
              <p className="text-xs text-muted mb-3">This changes whether Alex is a girl or a boy.</p>
              <div className="flex gap-2">
                {([
                  { value: 'girl',  label: 'Girl'           },
                  { value: 'boy',   label: 'Boy'            },
                  { value: 'other', label: 'Either'         },
                ] as const).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => handleGender(opt.value)}
                    className={`flex-1 py-2 rounded-[4px] text-sm border transition-colors
                      ${kidGender === opt.value
                        ? 'bg-accent text-white border-accent font-semibold'
                        : 'border-rule text-muted hover:border-accent/40'}`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <p className="text-xs font-semibold text-muted mb-3">Video interests</p>
              <div className="flex flex-wrap gap-2">
                {INTEREST_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => toggleInterest(opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm border transition-colors
                      ${interests.includes(opt.id)
                        ? 'border-accent bg-accent/10 text-accent font-medium'
                        : 'border-rule text-muted hover:border-muted'}`}
                  >
                    {opt.icon} {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sign out */}
        <div className="px-6 py-4 border-t border-rule">
          <button
            onClick={() => { onClose(); onLogout(); }}
            className="w-full py-2.5 rounded-[4px] text-sm font-semibold border border-rule
                       text-ink hover:bg-paper transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </>
  );
}
