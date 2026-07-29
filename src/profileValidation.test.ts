import { describe, it, expect } from 'vitest';
import { validateStudentProfile, defaultProfile } from './profileValidation';
import type { StudentProfileInput } from './profileTypes';

function validProfile(): StudentProfileInput {
  return {
    ...defaultProfile(),
    display_name: 'Ashi',
    grade: 7,
    reading_level: 7,
    focus: ['inference_from_text'],
    interests: ['gaming'],
  };
}

describe('validateStudentProfile', () => {
  it('rejects the bare default profile (no name, no grade, no interests)', () => {
    const { valid, errors } = validateStudentProfile(defaultProfile());
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a minimal valid profile', () => {
    const { valid, errors } = validateStudentProfile(validProfile());
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('requires a display name', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), display_name: '  ' });
    expect(valid).toBe(false);
  });

  it('rejects an out-of-range grade', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), grade: 15 });
    expect(valid).toBe(false);
  });

  it('requires at least one interest', () => {
    const { valid, errors } = validateStudentProfile({ ...validProfile(), interests: [] });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('interest'))).toBe(true);
  });

  it('rejects more than 3 focus skills', () => {
    const { valid, errors } = validateStudentProfile({
      ...validProfile(),
      focus: ['inference_from_text', 'nonverbal_cues', 'identify_problem_and_solutions', 'perspective_taking'],
    });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('3'))).toBe(true);
  });

  it('allows a focus skill outside the actionable set (flagged in the UI, not rejected)', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), focus: ['numerical_operations'] });
    expect(valid).toBe(true);
  });

  it('rejects an unrecognized skill id', () => {
    const { valid, errors } = validateStudentProfile({ ...validProfile(), strengths: ['not_a_real_skill'] });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not_a_real_skill'))).toBe(true);
  });

  it('rejects an unrecognized support id', () => {
    const { valid, errors } = validateStudentProfile({ ...validProfile(), supports: ['not_a_real_support'] });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('not_a_real_support'))).toBe(true);
  });

  it('rejects a non-positive session length', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), session_length_min: 0 });
    expect(valid).toBe(false);
  });
});
