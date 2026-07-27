import { useMemo, useState } from 'react';

function splitSentences(text: string): string[] {
  // Split on sentence-ending punctuation followed by space + capital letter.
  // Works for our controlled content; edge cases (Mr., Dr.) don't appear in the items.
  return text
    .split(/(?<=[.!?])\s+(?=[A-Z"'])/)
    .map(s => s.trim())
    .filter(s => s.length > 8);
}

interface Props {
  scenario: string;
  onConfirm: () => void;
}

export function EvidenceHighlighter({ scenario, onConfirm }: Props) {
  const sentences = useMemo(() => splitSentences(scenario), [scenario]);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
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
        {sentences.map((s, i) => (
          <button
            key={i}
            onClick={() => toggle(i)}
            className={`w-full text-left px-4 py-3 rounded-xl border text-sm leading-snug transition-all duration-150
              ${selected.has(i)
                ? 'border-blue-400 bg-blue-50 text-blue-900 font-medium shadow-sm'
                : 'border-slate-200 bg-white text-slate-600 hover:border-blue-200 hover:bg-blue-50/40'
              }`}
          >
            {selected.has(i) && (
              <span className="mr-2 text-blue-500">✓</span>
            )}
            {s}
          </button>
        ))}
      </div>

      <button
        onClick={onConfirm}
        disabled={selected.size === 0}
        className="w-full py-3.5 rounded-xl text-sm font-semibold transition-all
                   bg-blue-600 text-white hover:bg-blue-700
                   disabled:opacity-35 disabled:cursor-not-allowed"
      >
        {selected.size === 0 ? 'Pick a sentence to continue' : 'Got it →'}
      </button>
    </div>
  );
}
