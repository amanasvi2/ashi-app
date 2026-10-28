# Practice content review — 2026-10-28

This is an editorial/software review, not SLP approval, a validated reading assessment or a clinical study.

- Revised all 15 bundled fallback items. Each now has one displayed question, exact scenario evidence and a five-option word bank. Scenarios are 19–33 whitespace-delimited words (previously 30–56); this measures length, not reading grade. IDs/types/difficulty tags are preserved; those tags still need professional calibration.
- Generation requests one question, contextual uncertainty, distinct options and respect for stated needs/boundaries. Structural validation rejects fabricated evidence, duplicate choices, and missing/duplicate level-two support. It cannot establish semantic quality or clinical suitability.
- Free-text evaluator failures no longer invoke keyword-overlap grading. The interface offers retry without recording an attempt or changing earned progress for the failed check. The evaluator prompt accepts context-supported alternatives; model reliability is not established by these prompt changes.
- Screened all 30 developer golden items. Fifteen cases are on editorial hold in `golden/quality-review.json` because their expected labels infer unsupported motives, override stated needs or treat gaze/movement as proof of feeling. The optional real-model benchmark excludes those cases and labels its result draft-label agreement. Retained labels remain unvalidated. No cases were deleted, and no real-model benchmark was run for this review.
- The ten fictional pilot cards remain pending professional review. Their structure passes, but some distractors are too easy for difficulty calibration. Do not convert a schema pass into professional approval.

Remaining limits: ordinary generated items are not all sent through owner review (Carryover is); fallback contexts are fixed rather than personalized; difficulty tags and word-bank options need SLP review; recognition choices do not establish independent response or real-world transfer. No efficacy, child-comprehension, pricing or engagement result has been established.

Before the supervised child pilot, prioritize adult expert review of alternatives and feedback, age/reading demands, retained benchmark labels, and a sample of actual generated outputs at each support level. Use fictional data and preserve account/data isolation.
