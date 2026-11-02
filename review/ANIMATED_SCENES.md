# Animated story practice

The initial library has three authored scenes: a friend approaching a game, two friends reaching for one pair of scissors, and a friend putting down a game and asking for quiet. The short written story remains visible alongside the question and answer choices.

The public preview is `/demo?stories=1`. The same samples are available at the first stop of `/demo`. No account, model call or saved practice evidence is involved in those previews.

In authenticated practice, the scissors and quiet-minute animations accompany only the exact built-in `s1` and `n1` stories. Source and scenario checks prevent attaching these scenes to arbitrary generated or Carryover items. These items are normally used when online generation fails; this release does not make every AI question animated. Support levels, scoring and the reading gate remain unchanged.

Playback runs once through three pictures, with pause, replay, manual picture controls and hide. System reduced motion preferences show still pictures and disable autoplay. No flashing, endless loops, music or autoplay speech is added.

Content constraints for future scenes:

- Show only events in the story. Do not add a helpful response before the learner answers.
- Keep speech verbatim and avoid depicting a guessed emotion as fact.
- Let asking for quiet, help or a break mean what the person says.
- Review a scene and its choices together. Animation can change how easy a question is; do not treat a visual-supported score as proof of independent transfer.
- Expand the reviewed library before enabling automatic animation for generated or Carryover practice. The current scenes have engineering/editorial review, not clinical validation.
