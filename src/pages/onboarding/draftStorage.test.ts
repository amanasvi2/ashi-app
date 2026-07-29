import { describe, it, expect, beforeEach } from 'vitest';
import { saveDraft, loadDraft, clearDraft } from './draftStorage';
import type { IntakeDraft } from './draftStorage';
import { defaultProfile } from '../../profileValidation';

function sampleDraft(overrides: Partial<IntakeDraft> = {}): IntakeDraft {
  return {
    ...defaultProfile(),
    step: 3,
    displayName: 'Ashi',
    username: 'ashi123',
    grade: 7,
    targets: [{ skill: 'inference_from_text', current: null, goal: null, level: null }],
    ...overrides,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe('draftStorage', () => {
  it('returns null when nothing has been saved', () => {
    expect(loadDraft()).toBeNull();
  });

  it('round-trips a saved draft, resuming exactly what was saved', () => {
    const draft = sampleDraft();
    saveDraft(draft);
    expect(loadDraft()).toEqual(draft);
  });

  it('persists the current step so a reload resumes at the same place', () => {
    saveDraft(sampleDraft({ step: 7 }));
    expect(loadDraft()?.step).toBe(7);
  });

  it('never persists a password field', () => {
    saveDraft(sampleDraft());
    const raw = localStorage.getItem('ashi_intake_draft_v1');
    expect(raw).not.toBeNull();
    expect(raw).not.toMatch(/password/i);
  });

  it('clearDraft removes the saved draft', () => {
    saveDraft(sampleDraft());
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it('loadDraft returns null instead of throwing on corrupted JSON', () => {
    localStorage.setItem('ashi_intake_draft_v1', '{not valid json');
    expect(loadDraft()).toBeNull();
  });
});
