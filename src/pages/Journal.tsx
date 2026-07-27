import { useRef, useState } from 'react';
import type { JournalMood, JournalEntry } from '../types';
import { loadJournalEntries, saveJournalEntry, todaysJournalEntry } from '../storage';

// ── Mood data ─────────────────────────────────────────────────────────────────

const MOOD_DATA: {
  value: JournalMood; emoji: string; label: string;
  inactive: string; active: string; dot: string;
}[] = [
  { value: 'happy',       emoji: '😊', label: 'Happy',       inactive: 'border-slate-200 text-slate-600', active: 'border-yellow-400 bg-yellow-50 text-yellow-700 font-semibold',   dot: 'bg-yellow-400' },
  { value: 'excited',     emoji: '🤩', label: 'Excited',     inactive: 'border-slate-200 text-slate-600', active: 'border-orange-400 bg-orange-50 text-orange-700 font-semibold',   dot: 'bg-orange-400' },
  { value: 'proud',       emoji: '🌟', label: 'Proud',       inactive: 'border-slate-200 text-slate-600', active: 'border-amber-400 bg-amber-50 text-amber-700 font-semibold',      dot: 'bg-amber-400' },
  { value: 'calm',        emoji: '😌', label: 'Calm',        inactive: 'border-slate-200 text-slate-600', active: 'border-sky-400 bg-sky-50 text-sky-700 font-semibold',            dot: 'bg-sky-400' },
  { value: 'loved',       emoji: '🥰', label: 'Loved',       inactive: 'border-slate-200 text-slate-600', active: 'border-pink-400 bg-pink-50 text-pink-700 font-semibold',         dot: 'bg-pink-400' },
  { value: 'okay',        emoji: '😐', label: 'Okay',        inactive: 'border-slate-200 text-slate-600', active: 'border-slate-400 bg-slate-100 text-slate-700 font-semibold',    dot: 'bg-slate-400' },
  { value: 'bored',       emoji: '😑', label: 'Bored',       inactive: 'border-slate-200 text-slate-600', active: 'border-slate-400 bg-slate-100 text-slate-600 font-semibold',    dot: 'bg-slate-400' },
  { value: 'tired',       emoji: '😴', label: 'Tired',       inactive: 'border-slate-200 text-slate-600', active: 'border-indigo-300 bg-indigo-50 text-indigo-600 font-semibold',  dot: 'bg-indigo-300' },
  { value: 'worried',     emoji: '😟', label: 'Worried',     inactive: 'border-slate-200 text-slate-600', active: 'border-amber-500 bg-amber-50 text-amber-700 font-semibold',     dot: 'bg-amber-500' },
  { value: 'sad',         emoji: '😢', label: 'Sad',         inactive: 'border-slate-200 text-slate-600', active: 'border-blue-400 bg-blue-50 text-blue-700 font-semibold',        dot: 'bg-blue-400' },
  { value: 'frustrated',  emoji: '😤', label: 'Frustrated',  inactive: 'border-slate-200 text-slate-600', active: 'border-orange-500 bg-orange-50 text-orange-700 font-semibold',  dot: 'bg-orange-500' },
  { value: 'angry',       emoji: '😠', label: 'Angry',       inactive: 'border-slate-200 text-slate-600', active: 'border-red-500 bg-red-50 text-red-700 font-semibold',           dot: 'bg-red-500' },
  { value: 'confused',    emoji: '😕', label: 'Confused',    inactive: 'border-slate-200 text-slate-600', active: 'border-blue-400 bg-blue-50 text-blue-700 font-semibold',  dot: 'bg-blue-400' },
  { value: 'overwhelmed', emoji: '😩', label: 'Overwhelmed', inactive: 'border-slate-200 text-slate-600', active: 'border-rose-500 bg-rose-50 text-rose-700 font-semibold',        dot: 'bg-rose-500' },
];

const MOOD_DOT: Record<JournalMood, string> = Object.fromEntries(
  MOOD_DATA.map(m => [m.value, m.dot])
) as Record<JournalMood, string>;

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
  onSave: (entry: JournalEntry) => void;
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

  const handleSave = () => {
    if (!content.trim()) return;
    const entry: JournalEntry = {
      id: existing?.id ?? crypto.randomUUID(),
      date: existing?.date ?? new Date().toISOString(),
      mood,
      emoji: extraEmoji || undefined,
      content: content.trim(),
    };
    saveJournalEntry(entry);
    onSave(entry);
    setSaved(true);
  };

  const handleChange = (v: string) => { setContent(v); setSaved(false); };
  const handleMood = (m: JournalMood) => { setMood(m); setSaved(false); };

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-5">
      {/* Privacy note */}
      <div className="flex items-center gap-1.5 text-xs text-slate-400">
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
        </svg>
        Only you can see this. It is completely private.
      </div>

      {/* Mood grid */}
      <div>
        <p className="text-xs font-semibold text-slate-500 mb-3">How are you feeling today?</p>
        <div className="grid grid-cols-7 gap-1.5">
          {MOOD_DATA.map(m => (
            <button
              key={m.value}
              onClick={() => handleMood(m.value)}
              title={m.label}
              className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-center transition-all
                ${mood === m.value ? m.active : m.inactive + ' hover:border-slate-300'}`}
            >
              <span className="text-xl leading-none">{m.emoji}</span>
              <span className="text-[9px] leading-tight font-medium">{m.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Extra emoji */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-500">Add an emoji {extraEmoji && <span>{extraEmoji}</span>}</p>
          <button
            onClick={() => setShowPicker(v => !v)}
            className="text-xs text-blue-500 hover:text-blue-700 transition-colors"
          >
            {showPicker ? 'Close' : 'Pick one'}
          </button>
        </div>
        {showPicker && (
          <div className="grid grid-cols-8 gap-1 p-3 bg-slate-50 rounded-xl border border-slate-100">
            {EMOJI_GRID.map(e => (
              <button
                key={e}
                onClick={() => { setExtraEmoji(extraEmoji === e ? '' : e); setShowPicker(false); setSaved(false); }}
                className={`text-xl p-1 rounded-lg transition-all hover:bg-white hover:shadow-sm
                  ${extraEmoji === e ? 'bg-blue-100 scale-110' : ''}`}
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
          <p className="text-xs text-blue-500 italic bg-blue-50 rounded-lg px-3 py-2">{activePrompt}</p>
        )}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={e => handleChange(e.target.value)}
          rows={5}
          placeholder="Write anything you want here…"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800
                     placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <button
          onClick={randomPrompt}
          className="text-xs text-slate-400 hover:text-blue-500 transition-colors"
        >
          Need a prompt?
        </button>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-600 flex items-center gap-1">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Saved
            </span>
          )}
          <button
            onClick={handleSave}
            disabled={!content.trim() || saved}
            className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white
                       hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {saved ? 'Saved ✓' : 'Save'}
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
  const moodInfo = MOOD_DATA.find(m => m.value === entry.mood);

  return (
    <div
      className="bg-white rounded-xl border border-slate-100 px-5 py-4 cursor-pointer hover:border-slate-200 transition-colors"
      onClick={() => setExpanded(e => !e)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${MOOD_DOT[entry.mood]}`} />
          <span className="text-sm font-medium text-slate-700">{dateStr}</span>
          {moodInfo && (
            <span className="text-sm">{moodInfo.emoji}</span>
          )}
          {entry.emoji && <span className="text-sm">{entry.emoji}</span>}
        </div>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-slate-300 transition-transform ${expanded ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
      {!expanded && (
        <p className="text-xs text-slate-400 mt-1.5 ml-5 truncate">{entry.content}</p>
      )}
      {expanded && (
        <p className="text-sm text-slate-700 mt-3 leading-relaxed whitespace-pre-wrap">{entry.content}</p>
      )}
    </div>
  );
}

// ── Journal page ──────────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function Journal({ onBack }: Props) {
  const [todayEntry, setTodayEntry] = useState<JournalEntry | null>(() => todaysJournalEntry());
  const [allEntries, setAllEntries] = useState<JournalEntry[]>(() => loadJournalEntries());

  const streak = calcJournalStreak(allEntries);
  const today = new Date().toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  const handleSave = (entry: JournalEntry) => {
    setTodayEntry(entry);
    setAllEntries(loadJournalEntries());
  };

  const pastEntries = allEntries.filter(
    e => new Date(e.date).toDateString() !== new Date().toDateString()
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-lg md:max-w-xl mx-auto px-4 md:px-6 py-6 pb-10 space-y-5">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={onBack}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-slate-900">Your Journal</h1>
            <p className="text-xs text-slate-400 mt-0.5">{today}</p>
          </div>
          {streak > 0 && (
            <div className="flex flex-col items-center bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
              <span className="text-2xl">🔥</span>
              <span className="text-base font-bold text-amber-700 leading-none">{streak}</span>
              <span className="text-[10px] text-amber-600 font-medium">{streak === 1 ? 'day' : 'days'}</span>
            </div>
          )}
        </div>

        <TodayEditor existing={todayEntry} onSave={handleSave} />

        {pastEntries.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-400">Past entries</h3>
            {pastEntries.slice(0, 30).map(e => (
              <PastEntry key={e.id} entry={e} />
            ))}
          </div>
        )}

        {allEntries.length === 0 && (
          <p className="text-center text-sm text-slate-400 py-8">
            No entries yet. Write your first one above!
          </p>
        )}
      </div>
    </div>
  );
}
