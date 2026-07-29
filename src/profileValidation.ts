import type { StudentProfileInput, FormatConstraints } from './profileTypes';
import { isActionableTargetSkill } from './skills';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const DEFAULT_FORMAT_CONSTRAINTS: FormatConstraints = {
  one_step_at_a_time: false,
  short_directions: false,
  read_aloud: false,
  extended_response_time: false,
  immediate_feedback: true,
  graphic_organizers_for_writing: false,
};

// Only grade and at least one target are required — everything else has a
// sane default so a parent can finish in under two minutes.
export function defaultProfile(): StudentProfileInput {
  return {
    grade: NaN,
    instructional_reading_level: null,
    english_learner: false,
    strengths: [],
    targets: [],
    format_constraints: { ...DEFAULT_FORMAT_CONSTRAINTS },
    session_length_target_min: 12,
    motivation: null,
    interests: [],
  };
}

export function validateStudentProfile(input: StudentProfileInput): ValidationResult {
  const errors: string[] = [];

  if (!Number.isFinite(input.grade) || input.grade < 0 || input.grade > 12) {
    errors.push('Grade is required (0-12).');
  }

  if (!input.targets || input.targets.length === 0) {
    errors.push('Pick at least one target skill.');
  } else {
    for (const t of input.targets) {
      if (!isActionableTargetSkill(t.skill)) {
        errors.push(`"${t.skill}" is not a supported target skill.`);
      }
      for (const field of ['current', 'goal'] as const) {
        const v = t[field];
        if (v !== null && (v < 0 || v > 1)) {
          errors.push(`Target "${t.skill}" ${field} must be between 0 and 1.`);
        }
      }
    }
  }

  if (input.session_length_target_min <= 0) {
    errors.push('Session length must be a positive number of minutes.');
  }

  return { valid: errors.length === 0, errors };
}
