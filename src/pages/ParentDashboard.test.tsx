import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, cleanup } from '@testing-library/react';
import { ParentDashboard } from './ParentDashboard';
import type { StudentSummary } from '../students';

// Two students with deliberately different levels, keyed by the studentId
// each mocked storage function is called with — this is what actually
// proves the switcher doesn't bleed one student's state into another's:
// the component itself never sees fake data, only real per-argument
// dispatch, exactly like the live Supabase calls it replaces.
const LEVELS_BY_STUDENT: Record<string, { social: number; nonverbal: number; inference: number }> = {
  'student-a': { social: 3, nonverbal: 3, inference: 3 },
  'student-b': { social: 0, nonverbal: 0, inference: 0 },
};
const EMPTY_STREAKS = {
  social: { correct: 0, incorrect: 0 }, nonverbal: { correct: 0, incorrect: 0 }, inference: { correct: 0, incorrect: 0 },
};

vi.mock('../storage', () => ({
  loadSessions: async () => [],
  getTotalScore: () => 0,
  practicedToday: () => false,
  loadLevelSlice: async (studentId: string) => ({
    levels: LEVELS_BY_STUDENT[studentId],
    streaks: EMPTY_STREAKS,
    pending: { social: null, nonverbal: null, inference: null },
  }),
  loadDifficulty: async () => ({ social: 1, nonverbal: 1, inference: 1 }),
  parentJournalWrittenToday: async () => false,
  parentJournalActivity: async () => [],
  loadConfig: async () => ({ dailyMinimum: 1 }),
  saveConfig: async () => {},
  loadCoins: async () => ({ balance: 0, totalEarned: 0, hintTokens: 0 }),
  loadCustomRewards: async () => [],
  addCustomReward: async () => ({ id: 'x', label: '', emoji: '', url: '', cost: 0 }),
  deleteCustomReward: async () => {},
  loadFloorAlarms: async () => ({ social: false, nonverbal: false, inference: false }),
  loadStudentProfile: async () => null,
  initialDifficulty: { social: 1, nonverbal: 1, inference: 1 },
}));

const studentA: StudentSummary = { id: 'student-a', username: 'a', displayName: 'Maya' };
const studentB: StudentSummary = { id: 'student-b', username: 'b', displayName: 'Jordan' };

describe('ParentDashboard switching students', () => {
  afterEach(cleanup);

  it("shows the selected student's own levels and never a previous student's stale data", async () => {
    const { rerender } = render(<ParentDashboard onLogout={() => {}} student={studentA} />);
    await waitFor(() => expect(screen.getAllByText('Most help').length).toBeGreaterThan(0));

    // Simulates what App.tsx's switcher does: pass a different `student`
    // prop down. ParentDashboard's data-loading effect is keyed on
    // [student.id], so this alone should trigger a full, correct re-fetch.
    rerender(<ParentDashboard onLogout={() => {}} student={studentB} />);

    await waitFor(() => expect(screen.getAllByText('No hints').length).toBeGreaterThan(0));
    expect(screen.queryByText('Most help')).toBeNull();
  });
});
