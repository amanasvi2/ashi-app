import { isValidSkillId, isValidSupportId } from './skills.js';
import { MAX_FOCUS_SKILLS } from './profileValidation.js';
import type { ExtractedProfileDraft } from './profileTypes';

function emptyDraft(): ExtractedProfileDraft {
  return {
    display_name: null,
    grade: null,
    reading_level: null,
    strengths: [],
    focus: [],
    supports: [],
    session_length_min: null,
    interests: [],
  };
}

function sanitizeString(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function sanitizeNumber(value: unknown, min: number, max: number): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : null;
}

function sanitizeIdArray(value: unknown, isValid: (id: string) => boolean): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === 'string' && isValid(v));
}

// Interests aren't a closed vocabulary (unlike strengths/focus/supports) —
// free-text extraction naturally produces open-ended terms like "Minecraft"
// or "horses", so this just trims/dedupes rather than validating against a list.
function sanitizeInterests(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();
  for (const v of value) {
    if (typeof v !== 'string') continue;
    const trimmed = v.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen];
}

// Lenient, never throws: drops anything that doesn't match the expected
// shape or vocabulary rather than erroring, so a malformed or partial LLM
// response still lands the parent on a usable (if emptier) confirm screen.
export function sanitizeExtractedDraft(raw: unknown): ExtractedProfileDraft {
  if (!raw || typeof raw !== 'object') return emptyDraft();
  const r = raw as Record<string, unknown>;

  return {
    display_name: sanitizeString(r.display_name),
    grade: sanitizeNumber(r.grade, 0, 12),
    reading_level: sanitizeNumber(r.reading_level, 0, 13),
    strengths: sanitizeIdArray(r.strengths, isValidSkillId),
    focus: sanitizeIdArray(r.focus, isValidSkillId).slice(0, MAX_FOCUS_SKILLS),
    supports: sanitizeIdArray(r.supports, isValidSupportId),
    session_length_min: sanitizeNumber(r.session_length_min, 1, 120),
    interests: sanitizeInterests(r.interests),
  };
}
