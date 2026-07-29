import { describe, it, expect } from 'vitest';
import { validateStudentProfile, defaultProfile } from './profileValidation';
import type { StudentProfileInput } from './students';

function validProfile(): StudentProfileInput {
  return {
    ...defaultProfile(),
    grade: 7,
    targets: [{ skill: 'inference_from_text', current: 0.5, goal: 0.8, level: 4 }],
  };
}

describe('validateStudentProfile', () => {
  it('rejects the bare default profile (no grade, no targets)', () => {
    const { valid, errors } = validateStudentProfile(defaultProfile());
    expect(valid).toBe(false);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts a profile with only grade and one target set, everything else defaulted', () => {
    const { valid, errors } = validateStudentProfile(validProfile());
    expect(valid).toBe(true);
    expect(errors).toEqual([]);
  });

  it('rejects an out-of-range grade', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), grade: 15 });
    expect(valid).toBe(false);
  });

  it('rejects zero targets', () => {
    const { valid, errors } = validateStudentProfile({ ...validProfile(), targets: [] });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('target'))).toBe(true);
  });

  it('rejects a target skill outside the actionable set', () => {
    const { valid, errors } = validateStudentProfile({
      ...validProfile(),
      targets: [{ skill: 'numerical_operations', current: null, goal: null, level: null }],
    });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('numerical_operations'))).toBe(true);
  });

  it('rejects a current/goal accuracy outside 0-1', () => {
    const { valid } = validateStudentProfile({
      ...validProfile(),
      targets: [{ skill: 'inference_from_text', current: 1.5, goal: null, level: null }],
    });
    expect(valid).toBe(false);
  });

  it('rejects a non-positive session length', () => {
    const { valid } = validateStudentProfile({ ...validProfile(), session_length_target_min: 0 });
    expect(valid).toBe(false);
  });
});
