import type { StudentProfileInput } from './profileTypes';
import { isValidSkillId, isValidSupportId } from './skills.js';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const MAX_FOCUS_SKILLS = 3;
export const DEFAULT_SESSION_LENGTH_MIN = 20;

export function defaultProfile(): StudentProfileInput {
  return {
    display_name: '',
    grade: NaN,
    reading_level: NaN,
    strengths: [],
    focus: [],
    supports: [],
    session_length_min: DEFAULT_SESSION_LENGTH_MIN,
    interests: [],
  };
}

// display_name, grade, and at least one interest are required. Everything
// else has a sane default so a parent can finish in under two minutes.
export function validateStudentProfile(input: StudentProfileInput): ValidationResult {
  const errors: string[] = [];

  if (!input.display_name?.trim()) {
    errors.push('A name is required.');
  }

  if (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 12) {
    errors.push('Grade is required (0-12).');
  }

  if (!Number.isFinite(input.reading_level) || input.reading_level < 0 || input.reading_level > 13) {
    errors.push('Reading level must be a number between 0 and 13.');
  }

  if (!input.interests || input.interests.length === 0) {
    errors.push('Pick at least one interest.');
  }

  if (input.focus.length > MAX_FOCUS_SKILLS) {
    errors.push(`Pick at most ${MAX_FOCUS_SKILLS} focus skills.`);
  }

  for (const id of input.strengths) {
    if (!isValidSkillId(id)) errors.push(`"${id}" is not a recognized skill.`);
  }
  for (const id of input.focus) {
    if (!isValidSkillId(id)) errors.push(`"${id}" is not a recognized skill.`);
  }
  for (const id of input.supports) {
    if (!isValidSupportId(id)) errors.push(`"${id}" is not a recognized support.`);
  }

  if (!Number.isFinite(input.session_length_min) || input.session_length_min <= 0) {
    errors.push('Session length must be a positive number of minutes.');
  }

  return { valid: errors.length === 0, errors };
}
