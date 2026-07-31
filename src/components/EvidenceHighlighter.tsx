import { useMemo, useState } from 'react';

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space + capital letter.
  // Works for our controlled content; edge cases (Mr., Dr.) don't appear in the items.
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length > 8);
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

// Permissive on purpose: the model is asked to copy the evidence sentence
// verbatim, but minor punctuation/whitespace drift shouldn't count against
// the student, so this checks containment in either direction rather than
// exact equality.
function matchesEvidence(candidate: string, expected: string): boolean {
  const c = normalize(candidate);
  const e = normalize(expected);
  if (!c || !e) return false;
  return c.includes(e) || e.includes(c);
}

interface Props {
  scenario: string;
  expectedEvidence?: string;
  onConfirm: () => void;
}

// The signature interaction: click the sentence that shows why. The right
// one sweeps a wash of `evidence` left-to-right and stays for the rest of
// the item — the only bold visual moment in the app; everything else stays
// quiet around it. A wrong pick nudges rather than turning red (the score
// never drops, so nothing here should look like it did), and a quiet
// "Continue anyway" is always available so a stuck student is never
// trapped in this non-scored step.
export function EvidenceHighlighter({ scenario, expectedEvidence, onConfirm }: Props) {
  const sentences = useMemo(() => splitSentences(scenario), [scenario]);
  const [foundIdx, setFoundIdx] = useState<number | null>(null);
  const [missedIdx, setMissedIdx] = useState<number | null>(null);

  // If the model's evidence string doesn't line up with any split sentence
  // (e.g. it spans a split boundary), fall back to the original
  // any-sentence-is-fine behavior rather than showing broken feedback.
  const expectedIdx = useMemo(
    () => (expectedEvidence ? sentences.findIndex(s => matchesEvidence(s, expectedEvidence)) : -1),
    [sentences, expectedEvidence],
  );
  const evidenceCheckActive = expectedIdx !== -1;
  const found = foundIdx !== null;

  const handleClick = (i: number) => {
    if (found || !evidenceCheckActive) return;
    if (i === expectedIdx) {
      setFoundIdx(i);
      setMissedIdx(null);
    } else {
      setMissedIdx(i);
    }
  };

  const caption = found
    ? "That's the clue."
    : missedIdx !== null
    ? 'Not that one. Look for the sentence that shows why.'
    : 'Tap the sentence that shows why.';

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-ink">Which sentence shows why?</p>

      <p className="font-serif text-lg leading-[1.8]">
        {sentences.map((s, i) => (
          <button
            key={i}
            type="button"
            disabled={!evidenceCheckActive || found}
            onClick={() => handleClick(i)}
            className={`evidence-sentence inline rounded-[4px] text-left font-serif text-lg
              ${evidenceCheckActive && !found ? 'cursor-pointer' : 'cursor-default'}
              ${i === foundIdx ? 'evidence-confirmed' : ''}
              ${i === missedIdx ? 'evidence-missed' : ''}`}
          >
            {s}{' '}
          </button>
        ))}
      </p>

      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-muted" aria-live="polite">{evidenceCheckActive ? caption : ''}</p>
        {(found || !evidenceCheckActive) ? (
          <button
            onClick={onConfirm}
            className="py-2.5 px-5 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
          >
            Continue
          </button>
        ) : (
          <button
            onClick={onConfirm}
            className="text-sm text-muted hover:text-ink underline underline-offset-2 transition-colors"
          >
            Continue anyway
          </button>
        )}
      </div>
    </div>
  );
}
