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

export function EvidenceHighlighter({ scenario, expectedEvidence, onConfirm }: Props) {
  const sentences = useMemo(() => splitSentences(scenario), [scenario]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [checked, setChecked] = useState(false);

  // If the model's evidence string doesn't line up with any split sentence
  // (e.g. it spans a split boundary), fall back to the original
  // any-sentence-is-fine behavior rather than showing broken feedback.
  const expectedIdx = useMemo(
    () => (expectedEvidence ? sentences.findIndex(s => matchesEvidence(s, expectedEvidence)) : -1),
    [sentences, expectedEvidence],
  );
  const evidenceCheckActive = expectedIdx !== -1;
  const pickedCorrect = evidenceCheckActive && selected.has(expectedIdx);

  const toggle = (i: number) => {
    if (checked) return;
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const handlePrimary = () => {
    if (!evidenceCheckActive || checked) { onConfirm(); return; }
    setChecked(true);
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold text-slate-800">
          Which part shows your answer?
        </p>
        <p className="text-xs text-slate-400 mt-0.5">
          Tap the sentence that gives the clue.
        </p>
      </div>

      <div className="space-y-2">
        {sentences.map((s, i) => {
          const isSelected = selected.has(i);
          const showCorrect = checked && evidenceCheckActive && i === expectedIdx;
          const showWrong   = checked && evidenceCheckActive && isSelected && i !== expectedIdx;
          return (
            <button
              key={i}
              onClick={() => toggle(i)}
              disabled={checked}
              className={`w-full text-left px-4 py-3 rounded-xl border text-sm leading-snug transition-all duration-150
                ${showCorrect
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-medium'
                  : showWrong
                  ? 'border-red-300 bg-red-50 text-red-800'
                  : isSelected
                  ? 'border-blue-400 bg-blue-50 text-blue-900 font-medium shadow-sm'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'
                } ${checked ? 'cursor-default' : ''}`}
            >
              {isSelected && !checked && <span className="mr-2 text-blue-500">✓</span>}
              {showCorrect && <span className="mr-2 text-emerald-500">✓</span>}
              {showWrong && <span className="mr-2 text-red-400">✕</span>}
              {s}
            </button>
          );
        })}
      </div>

      {checked && evidenceCheckActive && (
        <p className={`text-sm rounded-xl px-4 py-2.5 ${pickedCorrect ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
          {pickedCorrect ? "Yes — that's the part that shows it." : 'Close — the highlighted sentence above is the one that shows it.'}
        </p>
      )}

      <button
        onClick={handlePrimary}
        disabled={selected.size === 0}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all
                   bg-blue-600 text-white hover:bg-blue-700
                   disabled:opacity-35 disabled:cursor-not-allowed"
      >
        {selected.size === 0 ? 'Pick a sentence to continue' : checked ? 'Continue →' : 'Check my pick'}
      </button>
    </div>
  );
}
