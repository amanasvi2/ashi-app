import { useEffect, useState } from 'react';
import type { StudentSummary } from '../students';
import type { ProfileSummary } from '../profiles';
import { loadSessions, loadFloorAlarms, loadLevelSlice } from '../storage';
import type { ItemType, LevelState } from '../types';
import { LoadingScreen } from '../components/LoadingScreen';
import { TYPE_LABELS, LEVEL_LABELS, LEVEL_COLORS } from '../components/LevelDisplay';

const ITEM_TYPES: ItemType[] = ['social', 'nonverbal', 'inference'];

interface RosterRow {
  student: StudentSummary;
  lastSessionDate: string | null;
  floorAlarm: boolean;
  levels: LevelState;
}

interface Props {
  students: StudentSummary[];
  incompleteProfile: ProfileSummary | null;
  canAddStudent: boolean;
  onSelectStudent: (id: string) => void;
  onFinishSetup: (profile: ProfileSummary) => void;
  onAddStudent: () => void;
  onLogout: () => void;
}

function formatDate(iso: string | null) {
  if (!iso) return 'No sessions yet';
  const d = new Date(iso);
  const today = new Date();
  if (d.toDateString() === today.toDateString()) return 'Today';
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

export function StudentRoster({
  students, incompleteProfile, canAddStudent, onSelectStudent, onFinishSetup, onAddStudent, onLogout,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<RosterRow[]>([]);

  useEffect(() => {
    (async () => {
      const loaded = await Promise.all(students.map(async student => {
        const [sessions, floorAlarms, levelSlice] = await Promise.all([
          loadSessions(student.id),
          loadFloorAlarms(student.id),
          loadLevelSlice(student.id),
        ]);
        return {
          student,
          lastSessionDate: sessions[0]?.date ?? null,
          floorAlarm: ITEM_TYPES.some(t => floorAlarms[t]),
          levels: levelSlice.levels,
        };
      }));
      setRows(loaded);
      setLoading(false);
    })();
  }, [students]);

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-4xl mx-auto px-4 md:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-0.5">Caseload</p>
            <h1 className="text-2xl font-bold text-ink tracking-tight">{rows.length} {rows.length === 1 ? 'student' : 'students'}</h1>
          </div>
          <button onClick={onLogout} className="text-xs text-muted hover:text-ink transition-colors mt-1">
            Log out
          </button>
        </div>

        {incompleteProfile && (
          <div className="bg-surface border border-rule shadow-[var(--shadow-raised)] rounded-[4px] p-4 flex items-center justify-between gap-3">
            <p className="text-sm text-ink">
              <span className="font-semibold capitalize">{incompleteProfile.displayName}</span>'s profile is saved,
              but they don't have a login yet.
            </p>
            <button
              onClick={() => onFinishSetup(incompleteProfile)}
              className="shrink-0 text-sm font-semibold text-accent hover:text-ink transition-colors"
            >
              Finish setup
            </button>
          </div>
        )}

        <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] divide-y divide-rule">
          {rows.map(row => (
            <button
              key={row.student.id}
              onClick={() => onSelectStudent(row.student.id)}
              className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-paper/60 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink capitalize">{row.student.displayName}</p>
                  {row.floorAlarm && (
                    <span className="text-xs font-semibold text-alert bg-alert/10 px-2 py-0.5 rounded-[4px] shrink-0">
                      Worth a look
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted mt-0.5">Last session: {formatDate(row.lastSessionDate)}</p>
              </div>

              <div className="hidden sm:flex gap-2 shrink-0">
                {ITEM_TYPES.map(t => (
                  <span
                    key={t}
                    title={`${TYPE_LABELS[t]}: ${LEVEL_LABELS[row.levels[t]]}`}
                    className={`text-[11px] font-medium px-2 py-1 rounded-[4px] ${LEVEL_COLORS[row.levels[t]]}`}
                  >
                    {LEVEL_LABELS[row.levels[t]]}
                  </span>
                ))}
              </div>

              <span className="text-muted shrink-0">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </span>
            </button>
          ))}

          {rows.length === 0 && (
            <p className="text-center text-sm text-muted py-8">No students yet.</p>
          )}
        </div>

        {canAddStudent ? (
          <button
            onClick={onAddStudent}
            className="w-full py-3 rounded-[4px] border-2 border-dashed border-rule text-sm text-muted
                       hover:border-accent/40 hover:text-accent transition-colors"
          >
            + Add a student
          </button>
        ) : (
          <p className="text-center text-xs text-muted">
            You've reached the student limit for this account.
          </p>
        )}
      </div>
    </div>
  );
}
