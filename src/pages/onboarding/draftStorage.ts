// Only the raw description text is persisted — an accidental reload
// shouldn't lose a parent's paragraph, but there's little value in
// persisting the confirm screen's edits too (it's a quick single pass).
const DRAFT_KEY = 'ashi_intake_description_v1';

export function saveDescriptionDraft(text: string): void {
  try { localStorage.setItem(DRAFT_KEY, text); } catch { /* storage unavailable */ }
}

export function loadDescriptionDraft(): string {
  try { return localStorage.getItem(DRAFT_KEY) ?? ''; } catch { return ''; }
}

export function clearDescriptionDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}
