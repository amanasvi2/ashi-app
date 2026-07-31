import { useEffect, useRef, useState } from 'react';
import type { JournalMood, JournalEntry } from '../types';
import { loadJournalEntries, saveJournalEntry, todaysJournalEntry } from '../storage';
import { LoadingScreen } from '../components/LoadingScreen';

// ── Mood icons ────────────────────────────────────────────────────────────────
// Word + line icon per mood, not a face — one neutral highlight style for
// every mood (the label and which button is active carry the meaning, not
// 14 invented colors).

function MoodIcon({ mood, size = 18 }: { mood: JournalMood; size?: number }) {
  const p = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.75, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (mood) {
    case 'happy':
      return <svg {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5.6 5.6 4.2 4.2M19.8 19.8l-1.4-1.4M5.6 18.4 4.2 19.8M19.8 4.2l-1.4 1.4"/></svg>;
    case 'excited':
      return <svg {...p}><path d="M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M19 5l-4 4M9 15l-4 4"/></svg>;
    case 'proud':
      return <svg {...p}><circle cx="12" cy="8" r="5"/><path d="M9 12.5 7 22l5-3 5 3-2-9.5"/></svg>;
    case 'calm':
      return <svg {...p}><path d="M2 8c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 14c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M2 20c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>;
    case 'loved':
      return <svg {...p}><path d="M12 21s-7.5-4.9-10-9.6C.4 7.8 2.4 4 6.2 4 8.6 4 10.6 5.4 12 7.5 13.4 5.4 15.4 4 17.8 4 21.6 4 23.6 7.8 22 11.4 19.5 16.1 12 21 12 21z"/></svg>;
    case 'okay':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><line x1="8" y1="12" x2="16" y2="12"/></svg>;
    case 'bored':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg>;
    case 'tired':
      return <svg {...p}><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>;
    case 'worried':
      return <svg {...p}><path d="M6 10a4 4 0 0 1 4-4c1.8 0 3 1 3.5 2.2A3.5 3.5 0 0 1 17 12H7a3 3 0 0 1-1-5.8"/><path d="M4 16c1-1 2-1 3 0s2 1 3 0 2-1 3 0 2 1 3 0 2-1 3 0"/></svg>;
    case 'sad':
      return <svg {...p}><path d="M12 3c3 4.5 6 8 6 11.5a6 6 0 0 1-12 0C6 11 9 7.5 12 3z"/></svg>;
    case 'frustrated':
      return <svg {...p}><polyline points="4 14 10 14 8 20 20 10 14 10 16 4"/></svg>;
    case 'angry':
      return <svg {...p}><path d="M12 22c4-1 6-3.5 6-7 0-3-2-4.5-3-7 0 2-1.2 2.7-2 2 0-1.5-.5-3.5-2-5-.5 3-2.5 4.5-3.5 7-1 2.5-1.5 4-1.5 5.5C6 20 8 21 12 22z"/><line x1="12" y1="14" x2="12" y2="17"/></svg>;
    case 'confused':
      return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 0 1 4.7 1.2c0 1.5-2.2 1.6-2.2 3.3"/><line x1="12" y1="17" x2="12" y2="17.01"/></svg>;
    case 'overwhelmed':
      return <svg {...p}><path d="M3 8h18"/><path d="M3 12.5h18"/><path d="M3 17h18"/></svg>;
  }
}

const MOOD_LABELS: Record<JournalMood, string> = {
  happy: 'Happy', excited: 'Excited', proud: 'Proud', calm: 'Calm', loved: 'Loved',
  okay: 'Okay', bored: 'Bored', tired: 'Tired', worried: 'Worried',
  sad: 'Sad', frustrated: 'Frustrated', angry: 'Angry', confused: 'Confused', overwhelmed: 'Overwhelmed',
};
const ALL_MOODS = Object.keys(MOOD_LABELS) as JournalMood[];

const EMOJI_GRID = [
  '😊','😄','😂','🤣','😍','🥰','😎','🤔',
  '🙃','😅','🤗','😇','🥳','🤩','😴','😤',
  '😭','😢','😠','😡','😟','😰','🤯','😱',
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍',
  '⭐','🌟','💫','✨','🔥','💥','🎉','🎊',
  '🦋','🌸','🌺','🍀','🌈','☀️','🌙','💎',
];

const PROMPTS = [
  'What was the best part of today?',
  'What was hard today?',
  'Did anything surprise you?',
  'What are you thinking about right now?',
  'Did anything happen with friends today?',
  'What made you smile today?',
  'Is there anything you wish went differently?',
];

function IconStreak() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="20" x2="4" y2="14"/><line x1="10" y1="20" x2="10" y2="10"/><line x1="16" y1="20" x2="16" y2="6"/>
    </svg>
  );
}

function calcJournalStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  const days = new Set(entries.map(e => new Date(e.date).toDateString()));
  const today = new Date();
  const todayStr = today.toDateString();
  const yStr = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1).toDateString();
  if (!days.has(todayStr) && !days.has(yStr)) return 0;
  const start = days.has(todayStr) ? new Date(today) : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  let streak = 0;
  const d = new Date(start);
  while (days.has(d.toDateString())) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

// ── Today editor ──────────────────────────────────────────────────────────────

function TodayEditor({ existing, onSave }: {
  existing: JournalEntry | null;
  onSave: (entry: JournalEntry) => Promise<void>;
}) {
  const [mood, setMood]       = useState<JournalMood>(existing?.mood ?? 'okay');
  const [content, setContent] = useState(existing?.content ?? '');
  const [extraEmoji, setExtraEmoji] = useState(existing?.emoji ?? '');
  const [saved, setSaved]     = useState(!!existing);
  const [showPicker, setShowPicker] = useState(false);
  const [activePrompt, setActivePrompt] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const randomPrompt = () => {
    const p = PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
    setActivePrompt(p);
    textareaRef.current?.focus();
  };

  const handleSave = async () => {
    if (!content.trim()) return;
    const entry: JournalEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      date: existing?.date ?? new Date().toISOString(),
      mood,
      emoji: extraEmoji || undefined,
      content: content.trim(),
    };
    await saveJournalEntry(entry);
    await onSave(entry);
    setSaved(true);
  };

  const handleChange = (v: string) => { setContent(v); setSaved(false); };
  const handleMood = (m: JournalMood) => { setMood(m); setSaved(false); };

  return (
    <div className="bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-5">
      {/* Privacy note */}
      <div className="flex items-center gap-1.5 text-xs text-muted">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Only you can see this. It is completely private.
      </div>

      {/* Mood grid */}
      <div>
        <p className="text-xs font-semibold text-muted mb-3">How are you feeling today?</p>
        <div className="grid grid-cols-7 gap-1.5">
          {ALL_MOODS.map(m => (
            <button
              key={m}
              onClick={() => handleMood(m)}
              title={MOOD_LABELS[m]}
              className={`flex flex-col items-center gap-1 p-2 rounded-[4px] border text-center transition-colors
                ${mood === m ? 'border-accent bg-accent/10 text-accent font-semibold' : 'border-rule text-muted hover:border-muted'}`}
            >
              <MoodIcon mood={m} />
              <span className="text-[9px] leading-tight font-medium">{MOOD_LABELS[m]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extra emoji */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted">Add an emoji {extraEmoji && <span>{extraEmoji}</span>}</p>
          <button
            onClick={() => setShowPicker(v => !v)}
            className="text-xs text-accent hover:text-ink transition-colors"
          >
            {showPicker ? 'Close' : 'Pick one'}
          </button>
        </div>
        {showPicker && (
          <div className="grid grid-cols-8 gap-1 p-3 bg-paper rounded-[4px] border border-rule">
            {EMOJI_GRID.map(e => (
              <button
                key={e}
                onClick={() => { setExtraEmoji(extraEmoji === e ? '' : e); setShowPicker(false); setSaved(false); }}
                className={`text-xl p-1 rounded-[4px] transition-colors hover:bg-surface
                  ${extraEmoji === e ? 'bg-accent/10' : ''}`}
              >
                {e}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Writing area */}
      <div className="space-y-2">
        {activePrompt && (
          <p className="text-xs text-accent bg-accent/5 rounded-[4px] px-3 py-2">{activePrompt}</p>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => handleChange(e.target.value)}
          rows={5}
          placeholder="Write anything you want here…"
          className="w-full rounded-[4px] border border-rule px-4 py-3 text-sm text-ink
                     placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 resize-none"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={randomPrompt}
          className="text-xs text-muted hover:text-accent transition-colors"
        >
          Need a prompt?
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-ink font-semibold flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim() || saved}
            className="px-5 py-2 rounded-[4px] text-sm font-semibold bg-accent text-white
                       hover:bg-accent-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Past entry ────────────────────────────────────────────────────────────────

function PastEntry({ entry }: { entry: JournalEntry }) {
  const [expanded, setExpanded] = useState(false);
  const d = new Date(entry.date);
  const dateStr = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="bg-surface rounded-[4px] border border-rule px-5 py-4 cursor-pointer hover:border-muted/50 transition-colors"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="text-muted shrink-0"><MoodIcon mood={entry.mood} size={14} /></span>
          <span className="text-sm font-medium text-ink">{dateStr}</span>
          <span className="text-xs text-muted">{MOOD_LABELS[entry.mood]}</span>
          {entry.emoji && <span className="text-sm">{entry.emoji}</span>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {!expanded && (
        <p className="text-xs text-muted mt-1.5 ml-6 truncate">{entry.content}</p>
      )}
      {expanded && (
        <p className="text-sm text-ink mt-3 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      )}
    </div>
  );
}

// ── Journal page ──────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function Journal({ onBack }: Props) {
  const [loading, setLoading]       = useState(true);
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(null);
  const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);

  useEffect(() => {
    (async () => {
      const [t, all] = await Promise.all([todaysJournalEntry(), loadJournalEntries()]);
      setTodayEntry(t); setAllEntries(all);
      setLoading(false);
    })();
  }, []);

  const streak = calcJournalStreak(allEntries);
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const handleSave = async (entry: JournalEntry) => {
    setTodayEntry(entry);
    setAllEntries(await loadJournalEntries());
  };

  const pastEntries = allEntries.filter(
    e => new Date(e.date).toDateString() !== new Date().toDateString()
  );

  if (loading) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-paper">
      <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-ink transition-colors mb-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-ink">Your Journal</h1>
            <p className="text-xs text-muted mt-0.5">{today}</p>
          </div>
          {streak > 0 && (
            <div className="flex flex-col items-center gap-0.5 bg-surface border border-rule shadow-[var(--shadow-raised)] rounded-[4px] px-4 py-2.5">
              <span className="text-ink"><IconStreak /></span>
              <span className="text-base font-bold text-ink leading-none">{streak}</span>
              <span className="text-[10px] text-muted font-medium">{streak === 1 ? 'day' : 'days'}</span>
            </div>
          )}
        </div>

        <TodayEditor existing={todayEntry} onSave={handleSave} />

        {pastEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Past entries</h3>
            {pastEntries.slice(0, 30).map(e => (
              <PastEntry key={e.id} entry={e} />
            ))}
          </div>
        )}

        {allEntries.length === 0 && (
          <p className="text-center text-sm text-muted py-8">
            No entries yet. Write your first one above!
          </p>
        )}
      </div>
    </div>
  );
}
