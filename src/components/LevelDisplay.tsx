import type { SupportLevel, ItemType } from '../types';

// Shared between ParentDashboard.tsx and StudentRoster.tsx — both show the
// same per-item-type support level at a glance, just at different scales
// (one student's detail view vs. a whole caseload's rows).

export const TYPE_LABELS: Record<ItemType, string> = {
  social: 'Social Problems', nonverbal: 'Nonverbal Cues', inference: 'Text Inference',
};

export const LEVEL_LABELS: Record<SupportLevel, string> = { 3: 'Most help', 2: 'Word bank', 1: 'Some help', 0: 'No hints' };
// One neutral chip style for every level, on purpose — the pips (below)
// and the label text carry the distinction, not a color invented per
// level. The token palette has no spare hue for this.
export const LEVEL_COLORS: Record<SupportLevel, string> = {
  3: 'text-muted bg-rule/40',
  2: 'text-muted bg-rule/40',
  1: 'text-muted bg-rule/40',
  0: 'text-muted bg-rule/40',
};

export function LevelPips({ level }: { level: SupportLevel }) {
  const filled = 3 - level;
  return (
    <span className="flex gap-1">
      {[0, 1, 2].map(i => (
        <span key={i} className={`w-1.5 h-1.5 rounded-[2px] ${i < filled ? 'bg-accent' : 'bg-rule'}`} />
      ))}
    </span>
  );
}
