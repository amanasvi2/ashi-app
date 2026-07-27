export type MainTab = 'home' | 'progress' | 'rewards';

interface Props {
  active: MainTab;
  onChange: (tab: MainTab) => void;
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? '2.25' : '1.75'} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
      <polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}

function ProgressIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={active ? '2.25' : '1.75'} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/>
      <line x1="12" y1="20" x2="12" y2="4"/>
      <line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}

function RewardsIcon({ active }: { active: boolean }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill={active ? 'currentColor' : 'none'}
      stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
    </svg>
  );
}

const TABS: { key: MainTab; label: string; Icon: React.ComponentType<{ active: boolean }> }[] = [
  { key: 'home',     label: 'Home',     Icon: HomeIcon },
  { key: 'progress', label: 'Progress', Icon: ProgressIcon },
  { key: 'rewards',  label: 'Rewards',  Icon: RewardsIcon },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-t border-slate-100 lg:hidden">
      <div className="flex max-w-lg mx-auto">
        {TABS.map(({ key, label, Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={`flex-1 flex flex-col items-center gap-1 py-3 transition-colors
              ${active === key ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Icon active={active === key} />
            <span className={`text-[10px] font-semibold tracking-wide ${active === key ? 'text-blue-600' : 'text-slate-400'}`}>
              {label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
