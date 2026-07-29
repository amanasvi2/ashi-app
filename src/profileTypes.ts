// Pure type definitions for the structured student profile — no runtime
// imports, so this is safe to import from both browser code and the
// server-side (Node) API functions without pulling in browser-only modules
// like supabase.ts or api.ts.

export interface StudentProfileInput {
  display_name: string;          // parent-chosen, not the child's legal name
  grade: number;
  reading_level: number;         // grade equivalent; defaults to grade if unknown
  strengths: string[];           // skill ids
  focus: string[];               // skill ids, max 3
  supports: string[];            // support ids
  session_length_min: number;    // default 20
  interests: string[];           // required, at least one
}

// What the LLM extraction endpoint returns before the parent has confirmed
// anything — every field optional/nullable since extraction may miss things.
export interface ExtractedProfileDraft {
  display_name: string | null;
  grade: number | null;
  reading_level: number | null;
  strengths: string[];
  focus: string[];
  supports: string[];
  session_length_min: number | null;
  interests: string[];
}
