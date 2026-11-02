# Animated story practice

Child home offers **Story pictures** by default and **New stories** for fresh text practice. The selected format travels through App, Practice and the authenticated `/api/items/generate` request. There are authored scenes for all 15 built-in items across social, nonverbal and inference skills at all three difficulty values.

Animated requests use the existing target weights, mastery adjustment and floor alarms to select unique stories at the requested difficulty. A finite library means some rounds are shorter than the usual requested count; items are not repeated or relabeled to pad a round. The current four support levels still control choices, word banks or typed answers. Existing scoring, attempt saving and adaptive transitions are retained.

Approved, matched Carryover items retain priority. They use their existing written format until separately authored scenes are available. Arbitrary AI and Carryover stories never receive guessed stock animations. Fresh text requests still use the existing model generation path. There are no database migrations or new model/video service dependencies.

The unsigned `/demo?stories=1` preview exposes the complete library plus the original joining-game example, with no account or saved evidence. The first stop of `/demo` retains the original three sample choices. The development-only child home preview shows the real home controls with fictional data.

Playback runs once through three pictures, with pause, replay, manual stepping and hide. System reduced motion shows still pictures and disables autoplay. No flashing, endless loops, music or autoplay speech is added.

Content constraints:

- Show only events in the story. Do not act out a successful response before answering.
- Keep dialogue verbatim. Do not depict guessed emotion as fact or teach that a sensory preference proves intent.
- Use neutral faces except a smile explicitly described in the story.
- Keep boundaries and requests for quiet, help or breaks meaningful.
- Review each scene and its choices together. Visual clues may change item difficulty; these are practice items, not clinical assessments.

The fixed bank does not generate reading-level variants; existing profile-based labels remain age dependent. New stories continues using the saved language profile for fresh generation. Attempt records do not yet separately label visual presentation. Do not interpret visual-supported practice as evidence of independent transfer. These scenes have editorial/engineering review, not clinical validation.
