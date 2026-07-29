// Pure type definitions for the structured intake profile — no runtime
// imports, so this is safe to import from both browser code and the
// server-side (Node) API functions without pulling in browser-only modules
// like supabase.ts or api.ts.

export interface ProfileTarget {
  skill: string;          // one of skills.ts's ACTIONABLE_TARGET_SKILL_IDS
  current: number | null; // 0-1 accuracy baseline
  goal: number | null;
  level: number | null;   // text level, for reading targets
}

export interface FormatConstraints {
  one_step_at_a_time: boolean;
  short_directions: boolean;
  read_aloud: boolean;
  extended_response_time: boolean;
  immediate_feedback: boolean;
  graphic_organizers_for_writing: boolean;
}

export interface StudentProfileInput {
  grade: number;
  instructional_reading_level: number | null;
  english_learner: boolean;
  strengths: string[];       // any skills.ts id
  targets: ProfileTarget[];
  format_constraints: FormatConstraints;
  session_length_target_min: number;
  motivation: string | null;
  interests: string[];
}
