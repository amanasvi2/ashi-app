import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Item, SessionMode, AnswerResult, SupportLevel, DifficultyState } from '../types';
import type { SessionRecord } from '../types';
import type { LevelSlice } from '../levelReducer';
import { levelReducer } from '../levelReducer';
import { ITEMS } from '../items';
import { useSpeech } from '../useSpeech';
import { HighlightedText } from '../components/HighlightedText';
import { EvidenceHighlighter } from '../components/EvidenceHighlighter';
import { evaluateFreeText, scoreForResult } from '../score';
import {
  saveSession, saveLevelSlice, saveDifficulty, updateDifficultyAfterSession,
  loadCoins, addCoins, useHintToken as spendHintToken,
  sessionsTodayCount, loadSessions, loadConfig, journalWrittenToday,
  pickSessionCount, loadInterests,
} from '../storage';
import { generateItems } from '../generateItems';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pickFallbackItems(mode: SessionMode, difficulty: DifficultyState, count: number): Item[] {
  const shuffle = <T,>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);
  const sortByDiff = (items: Item[], pref: number) =>
    [...items].sort((a, b) => {
      const da = Math.abs(a.difficulty - pref), db = Math.abs(b.difficulty - pref);
      return da !== db ? da - db : a.difficulty - b.difficulty;
    });
  if (mode === 'mixed') {
    const types = ['social', 'nonverbal', 'inference'] as const;
    const byType = Object.fromEntries(types.map(t => [t, ITEMS.filter(i => i.type === t)])) as Record<typeof types[number], Item[]>;
    const perType = Math.floor(count / 3), extras = count % 3;
    return shuffle([
      ...sortByDiff(byType.social,    difficulty.social).slice(0,    Math.min(5, perType + (extras > 0 ? 1 : 0))),
      ...sortByDiff(byType.nonverbal, difficulty.nonverbal).slice(0, Math.min(5, perType + (extras > 1 ? 1 : 0))),
      ...sortByDiff(byType.inference, difficulty.inference).slice(0, Math.min(5, perType)),
    ]);
  }
  const pool = ITEMS.filter(i => i.type === mode);
  return sortByDiff(pool, difficulty[mode]).slice(0, Math.min(count, pool.length));
}

function calcReadTime(scenario: string): number {
  const words = scenario.trim().split(/\s+/).length;
  return Math.min(18000, Math.max(5000, (words / 130) * 60 * 1000));
}

function shuffleChoices(choices: [string, string, string]) {
  const indexed = choices.map((t, i) => ({ t, i }));
  const shuffled = [...indexed].sort(() => Math.random() - 0.5);
  return { texts: shuffled.map(x => x.t), correctOrigIdx: shuffled.findIndex(x => x.i === 0) };
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
        <p className="text-slate-700 text-sm font-semibold">Creating your session...</p>
        <p className="text-slate-400 text-xs">About 10 seconds</p>
      </div>
      <button onClick={onCancel} className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2">
        Cancel
      </button>
    </div>
  );
}

// ── Speak button ──────────────────────────────────────────────────────────────

function SpeakButton({ text, speak, stop, speakingText }: {
  text: string; speak: (t: string) => void; stop: () => void; speakingText: string | null;
}) {
  const isPlaying = speakingText === text;
  return (
    <button
      onClick={() => isPlaying ? stop() : speak(text)}
      aria-label={isPlaying ? 'Stop reading' : 'Read aloud'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
        ${isPlaying ? 'bg-blue-100 text-blue-700 border border-blue-200' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}`}
    >
      {isPlaying ? (
        <>
          <span className="flex gap-0.5 items-end h-3.5">
            {[60, 100, 40].map((h, i) => (
              <span key={i} className="w-0.5 bg-blue-500 rounded-full"
                style={{ height: `${h}%`, animation: 'soundbar 0.6s ease-in-out infinite', animationDelay: `${i * 0.15}s` }} />
            ))}
          </span>
          Stop
        </>
      ) : (
        <>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
          </svg>
          Read to me
        </>
      )}
    </button>
  );
}

// ── Question panel ────────────────────────────────────────────────────────────
// Handles question → answer → evidence all in one card.

interface QuestionPanelProps {
  scenario: string;
  questionText: string;
  stem?: string;
  choices?: [string, string, string];
  level: SupportLevel;
  hintTokens: number;
  hintActive: boolean;
  onUseHint: () => void;
  speak: (t: string) => void;
  stop: () => void;
  speakingText: string | null;
  activeCharIndex: number | null;
  readingReady: boolean;
  readProgress: number;
  onSubmit: (answer: string) => void;
  feedback: { result: AnswerResult; text: string } | null;
  onNext: () => void;
}

function QuestionPanel(props: QuestionPanelProps) {
  const {
    scenario, questionText, stem, choices, level, hintTokens, hintActive, onUseHint,
    speak, stop, speakingText, activeCharIndex,
    readingReady, readProgress, onSubmit, feedback, onNext,
  } = props;
  const effectiveLevel = hintActive ? 2 : level;

  const [selected, setSelected]       = useState<number | null>(null);
  const [freeText, setFreeText]       = useState('');
  const [shuffled, setShuffled]       = useState<ReturnType<typeof shuffleChoices> | null>(null);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (choices) setShuffled(shuffleChoices(choices));
    setSelected(null);
    setFreeText('');
    setEvidenceMode(false);
    if (level <= 1 && !hintActive) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [choices, questionText, level, hintActive]);

  // When feedback arrives, transition to evidence mode
  useEffect(() => {
    if (feedback) setEvidenceMode(true);
  }, [feedback]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || feedback || !readingReady) return;
      if (effectiveLevel === 2 && selected !== null) { e.preventDefault(); doSubmit(); }
      if (effectiveLevel <= 1 && freeText.trim()) { e.preventDefault(); doSubmit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const doSubmit = () => {
    if (effectiveLevel === 2 && selected !== null && shuffled) onSubmit(shuffled.texts[selected]);
    else if (effectiveLevel <= 1 && freeText.trim()) onSubmit(freeText.trim());
  };

  const hasAnswer = (effectiveLevel === 2 && selected !== null) || (effectiveLevel <= 1 && freeText.trim().length > 0);
  const canSubmit = !feedback && readingReady && hasAnswer;

  const resultBg =
    feedback?.result === 'correct'  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
    feedback?.result === 'partial'  ? 'bg-amber-50 border-amber-200 text-amber-800' :
                                      'bg-red-50 border-red-200 text-red-800';
  const resultLabel =
    feedback?.result === 'correct'  ? 'Correct! ' :
    feedback?.result === 'partial'  ? 'Partly right. ' : 'Not quite. ';

  // Evidence mode: show feedback + sentence highlighter
  if (evidenceMode && feedback) {
    return (
      <div className="space-y-5">
        <div className={`rounded-xl border px-4 py-3.5 text-sm leading-relaxed ${resultBg}`}>
          <span className="font-semibold">{resultLabel}</span>{feedback.text}
        </div>
        <EvidenceHighlighter scenario={scenario} onConfirm={onNext} />
      </div>
    );
  }

  // Question mode
  return (
    <div className="space-y-4">

      {/* Question — if there's a stem, show it big as a sentence starter */}
      {stem ? (
        <div className="space-y-1">
          <p className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{questionText}</p>
          <p className="text-xl font-bold text-slate-800 leading-snug">
            {stem}<span className="text-slate-300"> ...</span>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <HighlightedText
            text={questionText}
            speakingText={speakingText}
            activeCharIndex={activeCharIndex}
            className="text-base font-semibold text-slate-800 leading-snug"
          />
          <SpeakButton text={questionText} speak={speak} stop={stop} speakingText={speakingText} />
        </div>
      )}

      {/* Hint button */}
      {level <= 1 && !hintActive && !feedback && hintTokens > 0 && (
        <button
          onClick={onUseHint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium
                     bg-blue-50 border border-blue-200 text-blue-700 hover:bg-blue-100 transition-colors"
        >
          Use a hint ({hintTokens} left)
        </button>
      )}

      {/* Multiple choice */}
      {effectiveLevel === 2 && shuffled && !feedback && (
        <div className="space-y-2">
          {shuffled.texts.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border text-sm leading-snug transition-all
                ${selected === idx
                  ? 'border-blue-400 bg-blue-50 text-blue-900 font-medium shadow-sm shadow-blue-100'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50/30'
                }`}
            >
              <span className={`mr-2.5 text-xs font-bold ${selected === idx ? 'text-blue-500' : 'text-slate-300'}`}>
                {['A', 'B', 'C'][idx]}
              </span>
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* Free text */}
      {effectiveLevel === 1 && !feedback && (
        <textarea ref={textareaRef} value={freeText} onChange={e => setFreeText(e.target.value)}
          rows={3} placeholder="Type your answer here"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300
                     focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
      )}
      {effectiveLevel === 0 && !feedback && (
        <textarea ref={textareaRef} value={freeText} onChange={e => setFreeText(e.target.value)}
          rows={3} placeholder="Type your answer here"
          className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300
                     focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
      )}

      {/* Submit button with reading gate */}
      {!feedback && (
        <button
          onClick={doSubmit}
          disabled={!canSubmit}
          className="relative w-full py-3.5 rounded-xl text-sm font-semibold transition-colors
                     bg-blue-600 text-white hover:bg-blue-700 disabled:cursor-not-allowed overflow-hidden"
        >
          {!readingReady && (
            <span
              className="absolute inset-y-0 right-0 bg-blue-800/40 pointer-events-none"
              style={{ width: `${(1 - readProgress) * 100}%` }}
            />
          )}
          <span className="relative">
            {!readingReady ? 'Reading…' : 'Check my answer'}
          </span>
        </button>
      )}
    </div>
  );
}

// ── Finished screen ───────────────────────────────────────────────────────────

function FinishedScreen({ score, maxScore, mode, coinsEarned, journalDone, onGoHome }: {
  score: number; maxScore: number; mode: SessionMode;
  coinsEarned: number; journalDone: boolean; onGoHome: () => void;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const message =
    pct >= 90 ? 'Excellent work!' : pct >= 70 ? 'Great effort!' :
    pct >= 50 ? 'Good work. Keep going.' : 'Nice try. Every session counts.';
  const modeLabel = { mixed: 'Mixed', social: 'Social Skills', nonverbal: 'Body Language', inference: 'Reading Clues' }[mode];

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-sm w-full text-center space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">Session complete</p>
          <p className="text-sm text-slate-400">{modeLabel}</p>
        </div>
        <div>
          <div className="text-6xl font-bold text-slate-900 tabular-nums">
            {score}<span className="text-3xl text-slate-300 font-normal"> / {maxScore}</span>
          </div>
          <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-slate-400 mt-1.5">{pct}%</p>
        </div>
        {coinsEarned > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <p className="text-amber-700 font-semibold text-sm">+{coinsEarned} coins earned!</p>
          </div>
        )}
        <p className="text-slate-600 text-base font-medium">{message}</p>
        {!journalDone && (
          <p className="text-xs text-slate-500 bg-slate-50 rounded-xl px-4 py-2.5 border border-slate-100">
            Remember to write in your journal today.
          </p>
        )}
        <button onClick={onGoHome}
          className="w-full py-3.5 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors">
          Back to home
        </button>
      </div>
    </div>
  );
}

// ── Practice ──────────────────────────────────────────────────────────────────

interface Props {
  mode: SessionMode;
  initialLevelSlice: LevelSlice;
  initialDifficulty: DifficultyState;
  onExit: () => void;
  onComplete: () => void;
}

export function Practice({ mode, initialLevelSlice, initialDifficulty, onExit, onComplete }: Props) {
  // ── State & refs ──────────────────────────────────────────────────────────
  const [items, setItems]       = useState<Item[]>([]);
  const [loading, setLoading]   = useState(true);
  const [itemIdx, setItemIdx]   = useState(0);
  const [levelSlice, dispatchLevel] = useReducer(levelReducer, initialLevelSlice);
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const [score, setScore]       = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [feedback, setFeedback] = useState<{ result: AnswerResult; text: string } | null>(null);
  const [done, setDone]         = useState(false);
  const [coinsEarned, setCoinsEarned] = useState(0);
  const [journalDone, setJournalDone] = useState(false);
  const [hintTokens, setHintTokens]   = useState(0);
  const [hintActiveQ, setHintActiveQ] = useState<string | null>(null);
  const [readingReady, setReadingReady] = useState(false);
  const [readProgress, setReadProgress] = useState(0);

  const endedByRef         = useRef<SessionRecord['endedBy']>('completed');
  const questionStartRef   = useRef(Date.now());
  const totalResponseMsRef = useRef(0);
  const answeredCountRef   = useRef(0);
  const { speak, stop, speakingText, activeCharIndex } = useSpeech();

  // ── Effects ───────────────────────────────────────────────────────────────

  useEffect(() => { void saveLevelSlice(levelSlice); }, [levelSlice]);

  // Resolve session count + hint tokens + interests, then generate AI items
  // (fall back to hardcoded on failure) — all under the one existing
  // "Creating your session..." loading gate.
  useEffect(() => {
    (async () => {
      const [sessions, coins, interests] = await Promise.all([loadSessions(), loadCoins(), loadInterests()]);
      const count = pickSessionCount(sessions);
      setHintTokens(coins.hintTokens);
      try {
        setItems(await generateItems(mode, initialDifficulty, count, interests));
      } catch {
        setItems(pickFallbackItems(mode, initialDifficulty, count));
      } finally {
        setLoading(false);
      }
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Journal status for the finished screen, resolved once the session ends.
  useEffect(() => {
    if (done) journalWrittenToday().then(setJournalDone);
  }, [done]);

  // Reading gate timer
  useEffect(() => {
    if (items.length === 0) return;
    setReadingReady(false);
    setReadProgress(0);
    const minMs = calcReadTime(items[itemIdx]?.scenario ?? '');
    const start = Date.now();
    const id = setInterval(() => {
      const pct = Math.min((Date.now() - start) / minMs, 1);
      setReadProgress(pct);
      if (pct >= 1) { setReadingReady(true); clearInterval(id); }
    }, 80);
    return () => clearInterval(id);
  }, [itemIdx, items]);

  // Reset response timer on new item
  useEffect(() => {
    questionStartRef.current = Date.now();
  }, [itemIdx]);

  // ── Memos & callbacks (hooks — before early returns) ─────────────────────

  const affectedTypes = useMemo(() => {
    if (mode !== 'mixed') return [mode] as const;
    return ['social', 'nonverbal', 'inference'] as const;
  }, [mode]);

  const finishSession = useCallback(async () => {
    const pct = maxScore > 0 ? score / maxScore : 0;
    const newDiff = updateDifficultyAfterSession(difficulty, pct, [...affectedTypes]);
    await saveDifficulty(newDiff);
    setDifficulty(newDiff);

    const [config, sessions] = await Promise.all([loadConfig(), loadSessions()]);
    const countBefore = sessionsTodayCount(sessions);
    let earned = 0;
    if (countBefore >= config.dailyMinimum) { await addCoins(10); earned += 10; }
    if (maxScore > 0 && score === maxScore)  { await addCoins(5);  earned += 5; }
    setCoinsEarned(earned);

    const avgResponseMs = answeredCountRef.current > 0
      ? Math.round(totalResponseMsRef.current / answeredCountRef.current)
      : undefined;

    await saveSession({
      id: crypto.randomUUID(),
      date: new Date().toISOString(),
      mode, score, maxScore,
      itemCount: itemIdx + 1,
      endedBy: endedByRef.current,
      levelSnapshot: levelSlice.levels,
      difficultySnapshot: newDiff,
      avgResponseMs,
    });
    setDone(true);
  }, [mode, score, maxScore, itemIdx, levelSlice, difficulty, affectedTypes]);

  // ── Early returns (after all hooks) ──────────────────────────────────────

  if (done) {
    return (
      <FinishedScreen
        score={score} maxScore={maxScore} mode={mode}
        coinsEarned={coinsEarned}
        journalDone={journalDone}
        onGoHome={onComplete}
      />
    );
  }

  if (loading || items.length === 0) {
    return <LoadingScreen onCancel={() => { stop(); onExit(); }} />;
  }

  // ── Per-render (safe: items non-empty) ────────────────────────────────────

  const currentItem     = items[itemIdx];
  const currentLevel    = levelSlice.levels[currentItem.type];
  const currentQuestion = currentItem.questions[0]; // always use first question; evidence replaces follow-up
  const hintActive      = hintActiveQ === `${itemIdx}`;
  const effectiveLevel  = hintActive ? 2 : currentLevel;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUseHint = async () => {
    const ok = await spendHintToken();
    if (ok) { setHintTokens(t => t - 1); setHintActiveQ(`${itemIdx}`); }
  };

  const handleAnswer = (answer: string) => {
    const correctAnswer = currentQuestion.choices?.[0] ?? '';
    let result: AnswerResult;
    let feedbackText: string;

    if (effectiveLevel === 2) {
      const ok = answer === correctAnswer;
      result = ok ? 'correct' : 'incorrect';
      feedbackText = ok ? 'That is right.' : `The best answer is: "${correctAnswer}"`;
    } else {
      const ev = evaluateFreeText(answer, correctAnswer);
      result = ev.result;
      feedbackText = ev.feedback;
    }

    totalResponseMsRef.current += Date.now() - questionStartRef.current;
    answeredCountRef.current   += 1;

    setScore(s => +(s + scoreForResult(result)).toFixed(1));
    setMaxScore(s => s + 1);
    setFeedback({ result, text: feedbackText });
    dispatchLevel({ type: 'RECORD', itemType: currentItem.type, result });
  };

  // Called by EvidenceHighlighter when the student picks a sentence
  const handleEvidenceConfirm = () => {
    stop();
    setFeedback(null);
    setHintActiveQ(null);
    const next = itemIdx + 1;
    if (next >= items.length) {
      endedByRef.current = 'completed';
      finishSession();
    } else {
      setItemIdx(next);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const TYPE_LABELS    = { social: 'Social Skills', nonverbal: 'Body Language', inference: 'Reading Clues' };
  const DIFF_LABELS    = { 1: 'Straightforward', 2: 'Read carefully', 3: 'Look for clues' };
  const SUPPORT_LABELS: Record<SupportLevel, string> = { 2: 'Most help', 1: 'Some help', 0: 'Open question' };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-100">
        <div className="max-w-lg md:max-w-xl lg:max-w-2xl mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <button onClick={() => { stop(); onExit(); }}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="flex gap-1.5 flex-1">
            {items.map((_, i) => (
              <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500
                ${i < itemIdx ? 'bg-blue-500' : i === itemIdx ? 'bg-blue-300' : 'bg-slate-200'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">{itemIdx + 1} / {items.length}</span>
            <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold tabular-nums">
              {score} pts
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 max-w-lg md:max-w-xl lg:max-w-2xl mx-auto w-full px-4 md:px-6 py-5 space-y-3.5">

        {/* Meta row */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-widest text-blue-500">
            {TYPE_LABELS[currentItem.type]}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">{DIFF_LABELS[currentItem.difficulty]}</span>
            <span className="text-slate-300">·</span>
            <span className="text-xs text-slate-400">{SUPPORT_LABELS[currentLevel]}</span>
          </div>
        </div>

        {/* Scenario card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm">
          <div className="px-6 pt-7 pb-5">
            <HighlightedText
              text={currentItem.scenario}
              speakingText={speakingText}
              activeCharIndex={activeCharIndex}
              className="text-[1.08rem] leading-[1.75] text-slate-800 font-[440] tracking-[0.01em]"
            />
          </div>
          <div className="px-6 pb-5">
            <SpeakButton text={currentItem.scenario} speak={speak} stop={stop} speakingText={speakingText} />
          </div>
        </div>

        {/* Question / evidence card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
          <QuestionPanel
            key={`item-${itemIdx}`}
            scenario={currentItem.scenario}
            questionText={currentQuestion.text}
            stem={currentQuestion.stem}
            choices={currentQuestion.choices}
            level={currentLevel}
            hintTokens={hintTokens}
            hintActive={hintActive}
            onUseHint={handleUseHint}
            speak={speak}
            stop={stop}
            speakingText={speakingText}
            activeCharIndex={activeCharIndex}
            readingReady={readingReady}
            readProgress={readProgress}
            onSubmit={handleAnswer}
            feedback={feedback}
            onNext={handleEvidenceConfirm}
          />
        </div>

      </div>
    </div>
  );
}
