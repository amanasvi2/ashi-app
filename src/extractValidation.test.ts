import { describe, it, expect } from 'vitest';
import { sanitizeExtractedDraft } from './extractValidation';

describe('sanitizeExtractedDraft', () => {
  it('passes through a well-formed draft unchanged', () => {
    const draft = sanitizeExtractedDraft({
      display_name: 'Ashi',
      grade: 7,
      reading_level: 6,
      strengths: ['word_reading', 'spelling'],
      focus: ['inference_from_text', 'nonverbal_cues'],
      supports: ['read_aloud'],
      session_length_min: 20,
      interests: ['gaming', 'animals'],
    });
    expect(draft).toEqual({
      display_name: 'Ashi',
      grade: 7,
      reading_level: 6,
      strengths: ['word_reading', 'spelling'],
      focus: ['inference_from_text', 'nonverbal_cues'],
      supports: ['read_aloud'],
      session_length_min: 20,
      interests: ['gaming', 'animals'],
    });
  });

  it('drops skill ids that are not in the vocabulary', () => {
    const draft = sanitizeExtractedDraft({ strengths: ['word_reading', 'not_a_real_skill'] });
    expect(draft.strengths).toEqual(['word_reading']);
  });

  it('drops support ids that are not in the vocabulary', () => {
    const draft = sanitizeExtractedDraft({ supports: ['read_aloud', 'not_a_real_support'] });
    expect(draft.supports).toEqual(['read_aloud']);
  });

  it('truncates focus to 3 skills', () => {
    const draft = sanitizeExtractedDraft({
      focus: ['inference_from_text', 'nonverbal_cues', 'identify_problem_and_solutions', 'perspective_taking'],
    });
    expect(draft.focus).toHaveLength(3);
  });

  it('coerces an out-of-range grade to null instead of accepting it', () => {
    const draft = sanitizeExtractedDraft({ grade: 47 });
    expect(draft.grade).toBeNull();
  });

  it('coerces a wrong-typed field to its empty default instead of throwing', () => {
    const draft = sanitizeExtractedDraft({ grade: 'seventh', strengths: 'word_reading', interests: 42 });
    expect(draft.grade).toBeNull();
    expect(draft.strengths).toEqual([]);
    expect(draft.interests).toEqual([]);
  });

  it('returns a safe empty draft for non-object input instead of throwing', () => {
    expect(sanitizeExtractedDraft(null)).toEqual(sanitizeExtractedDraft({}));
    expect(sanitizeExtractedDraft(undefined)).toEqual(sanitizeExtractedDraft({}));
    expect(sanitizeExtractedDraft('garbage')).toEqual(sanitizeExtractedDraft({}));
    expect(sanitizeExtractedDraft(42)).toEqual(sanitizeExtractedDraft({}));
    expect(sanitizeExtractedDraft([])).toEqual(sanitizeExtractedDraft({}));
  });

  it('returns all-empty fields for a genuinely empty object', () => {
    const draft = sanitizeExtractedDraft({});
    expect(draft).toEqual({
      display_name: null,
      grade: null,
      reading_level: null,
      strengths: [],
      focus: [],
      supports: [],
      session_length_min: null,
      interests: [],
    });
  });

  it('dedupes interests', () => {
    const draft = sanitizeExtractedDraft({ interests: ['gaming', 'Gaming', 'gaming', 'animals'] });
    // exact-string dedupe only (case-sensitive) — "Gaming" survives distinctly, both "gaming" collapse to one
    expect(draft.interests).toEqual(['gaming', 'Gaming', 'animals']);
  });
});
