import type { StudentProfileInput } from '../../students';

const DRAFT_KEY = 'ashi_intake_draft_v1';

// Everything except password — a secret shouldn't sit in localStorage even
// temporarily, so a resumed draft always requires re-entering it.
export interface IntakeDraft extends StudentProfileInput {
  step: number;
  displayName: string;
  username: string;
}

export function saveDraft(draft: IntakeDraft): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); } catch { /* storage unavailable */ }
}

export function loadDraft(): IntakeDraft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}
