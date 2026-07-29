import { describe, it, expect } from 'vitest';
import { isUnderStudentCap, STUDENT_CAP } from './ownerCaps';

describe('isUnderStudentCap', () => {
  it('allows a parent below the cap of 5', () => {
    expect(isUnderStudentCap(0, 'parent')).toBe(true);
    expect(isUnderStudentCap(4, 'parent')).toBe(true);
  });

  it('blocks a parent at or above the cap of 5', () => {
    expect(isUnderStudentCap(5, 'parent')).toBe(false);
    expect(isUnderStudentCap(6, 'parent')).toBe(false);
  });

  it('allows a clinician below the cap of 20', () => {
    expect(isUnderStudentCap(0, 'clinician')).toBe(true);
    expect(isUnderStudentCap(19, 'clinician')).toBe(true);
  });

  it('blocks a clinician at or above the cap of 20', () => {
    expect(isUnderStudentCap(20, 'clinician')).toBe(false);
    expect(isUnderStudentCap(25, 'clinician')).toBe(false);
  });

  it('exposes the exact cap values the product spec calls for', () => {
    expect(STUDENT_CAP.parent).toBe(5);
    expect(STUDENT_CAP.clinician).toBe(20);
  });
});
