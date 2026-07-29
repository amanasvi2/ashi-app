import { describe, it, expect, beforeEach } from 'vitest';
import { saveDescriptionDraft, loadDescriptionDraft, clearDescriptionDraft } from './draftStorage';

beforeEach(() => {
  localStorage.clear();
});

describe('draftStorage', () => {
  it('returns an empty string when nothing has been saved', () => {
    expect(loadDescriptionDraft()).toBe('');
  });

  it('round-trips saved description text', () => {
    saveDescriptionDraft('She loves Minecraft and struggles with group projects.');
    expect(loadDescriptionDraft()).toBe('She loves Minecraft and struggles with group projects.');
  });

  it('clearDescriptionDraft removes the saved draft', () => {
    saveDescriptionDraft('some text');
    clearDescriptionDraft();
    expect(loadDescriptionDraft()).toBe('');
  });

  it('overwrites a previous draft with the latest save', () => {
    saveDescriptionDraft('first draft');
    saveDescriptionDraft('second draft');
    expect(loadDescriptionDraft()).toBe('second draft');
  });
});
