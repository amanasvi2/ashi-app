// skills.ts — v1. Adding values later needs a migration, so treat this as versioned.
export const SKILLS = [
  // --- reading ---
  { id: "word_reading",              domain: "reading",  label: "Sounding out and reading words" },
  { id: "reading_fluency",           domain: "reading",  label: "Reading smoothly at a good pace" },
  { id: "literal_recall",            domain: "reading",  label: "Finding answers stated right in the text" },
  { id: "inference_from_text",       domain: "reading",  label: "Figuring out things the text doesn't say directly" },
  { id: "main_idea_summarizing",     domain: "reading",  label: "Summarizing what a passage was about" },
  { id: "vocabulary",                domain: "reading",  label: "Understanding new or unfamiliar words" },

  // --- writing ---
  { id: "spelling",                  domain: "writing",  label: "Spelling" },
  { id: "sentence_construction",     domain: "writing",  label: "Writing complete, varied sentences" },
  { id: "paragraph_structure",       domain: "writing",  label: "Building a full paragraph" },
  { id: "multi_paragraph_writing",   domain: "writing",  label: "Writing more than one paragraph" },
  { id: "topic_maintenance_writing", domain: "writing",  label: "Staying on topic while writing" },
  { id: "editing_conventions",       domain: "writing",  label: "Checking their own punctuation and capitals" },

  // --- math ---
  { id: "number_sense",              domain: "math",     label: "Understanding how numbers work" },
  { id: "numerical_operations",      domain: "math",     label: "Adding, subtracting, multiplying, dividing" },
  { id: "math_fluency",              domain: "math",     label: "Doing math facts quickly" },
  { id: "multi_step_problems",       domain: "math",     label: "Problems with several steps" },
  { id: "word_problems",             domain: "math",     label: "Math problems written out in words" },
  { id: "fractions_decimals",        domain: "math",     label: "Fractions and decimals" },
  { id: "geometry",                  domain: "math",     label: "Shapes, area, and space" },
  { id: "measurement_data",          domain: "math",     label: "Measuring, graphs, and charts" },

  // --- communication ---
  { id: "conversational_turns",      domain: "comm",     label: "Keeping a back-and-forth conversation going" },
  { id: "topic_maintenance_speech",  domain: "comm",     label: "Staying on topic when talking" },
  { id: "nonverbal_cues",            domain: "comm",     label: "Reading faces and body language" },
  { id: "identify_problem_and_solutions", domain: "comm", label: "Spotting a problem and thinking of solutions" },
  { id: "nonliteral_language",       domain: "comm",     label: "Jokes, idioms, and sarcasm" },
  { id: "perspective_taking",        domain: "comm",     label: "Seeing things from someone else's view" },
  { id: "asking_for_help",           domain: "comm",     label: "Asking for help or clarification" },
  { id: "articulation",              domain: "comm",     label: "Being clearly understood when speaking" },

  // --- executive function / behavior ---
  { id: "task_initiation",           domain: "exec",     label: "Getting started on work" },
  { id: "sustained_attention",       domain: "exec",     label: "Sticking with a task" },
  { id: "following_directions",      domain: "exec",     label: "Following multi-step directions" },
  { id: "self_monitoring",           domain: "exec",     label: "Noticing and fixing their own mistakes" },
  { id: "organization",              domain: "exec",     label: "Keeping track of materials and assignments" },
  { id: "transitions",               domain: "exec",     label: "Switching between activities" },
  { id: "emotional_regulation",      domain: "exec",     label: "Managing frustration" },
  { id: "waiting_turn",              domain: "exec",     label: "Waiting for a turn to speak" },
] as const;

export type SkillId = (typeof SKILLS)[number]["id"];
export type SkillDomain = (typeof SKILLS)[number]["domain"];

export const DOMAIN_LABELS: Record<SkillDomain, string> = {
  reading: "Reading",
  writing: "Writing",
  math: "Math",
  comm: "Communication",
  exec: "Getting things done",
};

// Only these skills currently map to something this app's practice-item
// generator can produce (social/nonverbal/inference items). A `focus` skill
// outside this set is still stored, but flagged on the confirm screen as
// not yet used in practice sessions rather than silently accepted or
// dropped — see server/skillMapping.ts for the weight each one contributes.
export const ACTIONABLE_FOCUS_SKILL_IDS = [
  "identify_problem_and_solutions",
  "perspective_taking",
  "nonverbal_cues",
  "inference_from_text",
  "main_idea_summarizing",
  "nonliteral_language",
] as const satisfies readonly SkillId[];

export type ActionableFocusSkillId = (typeof ACTIONABLE_FOCUS_SKILL_IDS)[number];

export function isActionableFocusSkill(id: string): id is ActionableFocusSkillId {
  return (ACTIONABLE_FOCUS_SKILL_IDS as readonly string[]).includes(id);
}

export function skillById(id: string) {
  return SKILLS.find(s => s.id === id);
}

export function isValidSkillId(id: string): id is SkillId {
  return SKILLS.some(s => s.id === id);
}

// --- supports ---------------------------------------------------------

export const SUPPORTS = [
  { id: "one_step_at_a_time",             label: "One step at a time" },
  { id: "short_directions",               label: "Short, simple directions" },
  { id: "repeat_directions",              label: "Repeat directions when needed" },
  { id: "read_aloud",                     label: "Read things aloud" },
  { id: "extended_response_time",         label: "Extra time to respond" },
  { id: "immediate_feedback",             label: "Feedback right away" },
  { id: "graphic_organizers_for_writing", label: "Graphic organizers for writing" },
] as const;

export type SupportId = (typeof SUPPORTS)[number]["id"];

export function isValidSupportId(id: string): id is SupportId {
  return SUPPORTS.some(s => s.id === id);
}

export function supportById(id: string) {
  return SUPPORTS.find(s => s.id === id);
}
