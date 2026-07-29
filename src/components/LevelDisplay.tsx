import type { SupportLevel, ItemType } from '../types';

// Shared between ParentDashboard.tsx and StudentRoster.tsx — both show the
// same per-item-type support level at a glance, just at different scales
// (one student's detail view vs. a whole caseload's rows).

export const TYPE_LABELS: Record<ItemType, string> = {
  social: 'Social Problems', nonverbal: 'Nonverbal Cues', inference: 'Text Inference',
};

export const LEVEL_LABELS: Record<SupportLevel, string> = { 3: 'Most help', 2: 'Word bank', 1: 'Some help', 0: 'No hints' };
export const LEVEL_COLORS: Record<SupportLevel, string> = {
  3: 'text-slate-500 bg-slate-100',
  2: 'text-sky-700 bg-sky-50',
  1: 'text-amber-700 bg-amber-50',
  0: 'text-emerald-700 bg-emerald-50',
};

export function LevelPips({ level }: { level: SupportLevel }) {
  const filled = 3 - level;
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-2 h-2 rounded-full ${i < filled ? 'bg-blue-500' : 'bg-slate-200'}`} />
      ))}
    </span>
  );
}
