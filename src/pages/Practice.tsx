import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { Item, SessionMode, AnswerResult, SupportLevel, DifficultyState, WordBankOption, ItemType } from '../types';
import type { SessionRecord } from '../types';
import type { LevelSlice } from '../adaptiveEngine';
import { levelReducer } from '../adaptiveEngine';
import { ITEMS } from '../items';
import { useSpeech } from '../useSpeech';
import { HighlightedText } from '../components/HighlightedText';
import { EvidenceHighlighter } from '../components/EvidenceHighlighter';
import { evaluateFreeText, scoreForResult } from '../score';
import { FloorAlarmError } from '../api';
import {
  saveSession, saveLevelSlice, recordAttempt, recomputeDifficulty,
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

// Matches the "Read to me" TTS voice's actual pace (useSpeech.ts uses
// rate 0.88, roughly 150 words/minute) so the gate never blocks longer
// than it would take to actually hear the scenario + question read aloud.
function calcReadTime(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(12000, Math.max(3000, (words / 150) * 60 * 1000));
}

function shuffleChoices(choices: [string, string, string]) {
  const indexed = choices.map((t, i) => ({ t, i }));
  const shuffled = [...indexed].sort(() => Math.random() - 0.5);
  return { texts: shuffled.map(x => x.t), correctOrigIdx: shuffled.findIndex(x => x.i === 0) };
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen({ onCancel }: { onCancel: () => void }) {
  return (
    <div className="min-h-screen bg-paper flex flex-col items-center justify-center gap-6">
      <div className="text-center space-y-3">
        <div className="w-8 h-8 border-2 border-rule border-t-accent rounded-full animate-spin mx-auto" />
        <p className="text-ink text-sm font-medium">Making your practice session</p>
        <p className="text-muted text-xs">About 10 seconds</p>
      </div>
      <button onClick={onCancel} className="text-xs text-muted hover:text-ink underline underline-offset-2">
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-sm font-medium transition-colors
        ${isPlaying ? 'bg-accent/10 text-accent border border-accent/30' : 'border border-rule text-muted hover:text-ink hover:border-muted'}`}
    >
      {isPlaying ? (
        <>
          <span className="flex gap-0.5 items-end h-3.5">
            {[60, 100, 40].map((h, i) => (
              <span key={i} className="w-0.5 bg-accent rounded-full"
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
          Read aloud
        </>
      )}
    </button>
  );
}

// ── Feedback ──────────────────────────────────────────────────────────────────
// Never red for a wrong answer — the score never drops, so the visual
// language never suggests it did. Correct/partial both get a check (partial
// just says so in words); incorrect gets a plain mark plus the correction.

function FeedbackIcon({ result }: { result: AnswerResult }) {
  if (result === 'incorrect') {
    return (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-muted mt-0.5 shrink-0">
        <circle cx="12" cy="12" r="2.5" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round"
      className={`${result === 'correct' ? 'text-ink' : 'text-muted'} mt-0.5 shrink-0`}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}

// ── Question panel ────────────────────────────────────────────────────────────
// Handles question → answer → evidence all in one flow.

interface QuestionPanelProps {
  scenario: string;
  questionText: string;
  stem?: string;
  choices?: [string, string, string];
  evidence?: string;
  wordBank?: WordBankOption[];
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
  evaluating: boolean;
  onSubmit: (answer: string) => void;
  feedback: { result: AnswerResult; text: string } | null;
  onNext: () => void;
}

function QuestionPanel(props: QuestionPanelProps) {
  const {
    scenario, questionText, stem, choices, evidence, wordBank, level, hintTokens, hintActive, onUseHint,
    speak, stop, speakingText, activeCharIndex,
    readingReady, readProgress, evaluating, onSubmit, feedback, onNext,
  } = props;
  const effectiveLevel = hintActive ? 3 : level;

  const [selected, setSelected]       = useState<number | null>(null);
  const [freeText, setFreeText]       = useState('');
  const [shuffled, setShuffled]       = useState<ReturnType<typeof shuffleChoices> | null>(null);
  const [wordBankOrder, setWordBankOrder] = useState<string[] | null>(null);
  const [evidenceMode, setEvidenceMode] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (choices) setShuffled(shuffleChoices(choices));
    if (wordBank) setWordBankOrder([...wordBank.map(w => w.text)].sort(() => Math.random() - 0.5));
    setSelected(null);
    setFreeText('');
    setEvidenceMode(false);
    if (level <= 1 && !hintActive) setTimeout(() => textareaRef.current?.focus(), 80);
  }, [choices, wordBank, questionText, level, hintActive]);

  // When feedback arrives, transition to evidence mode
  useEffect(() => {
    if (feedback) setEvidenceMode(true);
  }, [feedback]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.shiftKey || feedback || !readingReady) return;
      if (effectiveLevel >= 2 && selected !== null) { e.preventDefault(); doSubmit(); }
      if (effectiveLevel <= 1 && freeText.trim()) { e.preventDefault(); doSubmit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const doSubmit = () => {
    if (effectiveLevel === 3 && selected !== null && shuffled) onSubmit(shuffled.texts[selected]);
    else if (effectiveLevel === 2 && selected !== null && wordBankOrder) onSubmit(wordBankOrder[selected]);
    else if (effectiveLevel <= 1 && freeText.trim()) onSubmit(freeText.trim());
  };

  const hasAnswer = (effectiveLevel >= 2 && selected !== null) || (effectiveLevel <= 1 && freeText.trim().length > 0);
  const canSubmit = !feedback && !evaluating && readingReady && hasAnswer;

  // Evidence mode: show feedback + sentence highlighter
  if (evidenceMode && feedback) {
    return (
      <div className="space-y-5">
        <div className="flex items-start gap-3 px-1">
          <FeedbackIcon result={feedback.result} />
          <p className="text-[15px] leading-relaxed text-ink">
            {feedback.result === 'partial' && <span className="text-muted">Partly right. </span>}
            {feedback.text}
          </p>
        </div>
        <EvidenceHighlighter scenario={scenario} expectedEvidence={evidence} onConfirm={onNext} />
      </div>
    );
  }

  // Question mode
  return (
    <div className="space-y-5">

      {/* Question — a stem reads as the sentence the student is completing;
          it stays part of the reading flow rather than a boxed label. */}
      {stem ? (
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted uppercase tracking-wide">{questionText}</p>
          <p className="font-serif text-xl leading-snug text-ink">
            {stem}
            {effectiveLevel === 2 && wordBankOrder && selected !== null ? (
              <span className="text-accent font-semibold"> {wordBankOrder[selected]}</span>
            ) : (
              <span className="text-muted">{' '}_____</span>
            )}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <HighlightedText
            text={questionText}
            speakingText={speakingText}
            activeCharIndex={activeCharIndex}
            className="font-serif text-xl font-semibold leading-snug text-ink"
          />
          <SpeakButton text={questionText} speak={speak} stop={stop} speakingText={speakingText} />
        </div>
      )}

      {/* Hint button — jumps to full multiple choice */}
      {level <= 2 && !hintActive && !feedback && hintTokens > 0 && (
        <button
          onClick={onUseHint}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[4px] text-xs font-medium
                     border border-accent/30 text-accent hover:bg-accent/5 transition-colors"
        >
          Use a hint ({hintTokens} left)
        </button>
      )}

      {/* Multiple choice */}
      {effectiveLevel === 3 && shuffled && !feedback && (
        <div className="space-y-2">
          {shuffled.texts.map((choice, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`w-full text-left px-4 py-3.5 rounded-[4px] border font-serif text-[17px] leading-snug transition-colors
                ${selected === idx
                  ? 'border-accent bg-accent/5 text-ink'
                  : 'border-rule bg-surface text-ink hover:border-muted'
                }`}
            >
              <span className={`mr-2.5 text-xs font-sans font-bold ${selected === idx ? 'text-accent' : 'text-muted'}`}>
                {['A', 'B', 'C'][idx]}
              </span>
              {choice}
            </button>
          ))}
        </div>
      )}

      {/* Word bank — bridges recognition (multiple choice) to production
          (free text). Picking a word fills the blank in the stem above,
          so the option reads as completing the sentence, not a floating pill. */}
      {effectiveLevel === 2 && wordBankOrder && !feedback && (
        <div className="flex flex-wrap gap-2">
          {wordBankOrder.map((word, idx) => (
            <button
              key={idx}
              onClick={() => setSelected(idx)}
              className={`px-3.5 py-2 rounded-[4px] border font-serif text-base transition-colors
                ${selected === idx
                  ? 'border-accent bg-accent/5 text-ink'
                  : 'border-rule bg-surface text-ink hover:border-muted'
                }`}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      {/* Free text — the stem (if any) already appears above as part of the
          reading flow; the input itself stays minimal-chrome, an
          underline rather than a boxed widget, so it reads as where you
          keep writing rather than a separate form field. */}
      {effectiveLevel <= 1 && !feedback && (
        <textarea ref={textareaRef} value={freeText} onChange={e => setFreeText(e.target.value)}
          rows={3} placeholder="Type your answer here"
          className="w-full font-serif text-lg leading-relaxed text-ink placeholder:text-muted/70 bg-transparent
                     border-0 border-b border-rule focus:border-accent focus:outline-none resize-none pb-2" />
      )}

      {/* Submit button with reading gate */}
      {!feedback && (
        <button
          onClick={doSubmit}
          disabled={!canSubmit}
          className="relative w-full py-3.5 rounded-[4px] text-sm font-semibold transition-colors
                     bg-accent text-white hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed overflow-hidden"
        >
          {!readingReady && (
            <span
              className="absolute inset-y-0 right-0 bg-black/15 pointer-events-none"
              style={{ width: `${(1 - readProgress) * 100}%` }}
            />
          )}
          <span className="relative">
            {!readingReady ? 'Reading…' : evaluating ? 'Checking…' : 'Check my answer'}
          </span>
        </button>
      )}
    </div>
  );
}

// ── Finished screen ───────────────────────────────────────────────────────────

function FinishedScreen({ score, maxScore, mode, coinsEarned, journalDone, floorAlarmNotice, onGoHome }: {
  score: number; maxScore: number; mode: SessionMode;
  coinsEarned: number; journalDone: boolean; floorAlarmNotice: ItemType | null; onGoHome: () => void;
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
  const message =
    pct >= 90 ? 'Excellent work.' : pct >= 70 ? 'Great effort.' :
    pct >= 50 ? 'Good work. Keep going.' : 'Nice try. Every session counts.';
  const modeLabel = { mixed: 'Mixed', social: 'Social Skills', nonverbal: 'Body Language', inference: 'Reading Clues' }[mode];

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4">
      <div className="bg-surface rounded-[4px] shadow-[var(--shadow-raised)] p-8 max-w-sm w-full text-center space-y-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">Session complete</p>
          <p className="text-sm text-muted">{modeLabel}</p>
        </div>
        <div>
          <div className="text-6xl font-bold text-ink tabular-nums">
            {score}<span className="text-3xl text-muted font-normal"> / {maxScore}</span>
          </div>
          <div className="mt-3 h-1.5 bg-rule rounded-[4px] overflow-hidden">
            <div className="h-full bg-accent rounded-[4px] transition-all duration-1000" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs text-muted mt-1.5">{pct}%</p>
        </div>
        {coinsEarned > 0 && (
          <div className="border border-rule rounded-[4px] px-4 py-3">
            <p className="text-ink font-semibold text-sm">+{coinsEarned} coins earned</p>
          </div>
        )}
        <p className="text-ink text-base font-medium">{message}</p>
        {!journalDone && (
          <p className="text-xs text-muted bg-paper rounded-[4px] px-4 py-2.5 border border-rule">
            Remember to write in your journal today.
          </p>
        )}
        {floorAlarmNotice && (
          <p className="text-xs text-alert bg-alert/5 rounded-[4px] px-4 py-2.5 border border-alert/25">
            Your parent will see a note about this practice type.
          </p>
        )}
        <button onClick={onGoHome}
          className="w-full py-3.5 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
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
  const [blockedType, setBlockedType] = useState<ItemType | null>(null);
  const [floorAlarmNotice, setFloorAlarmNotice] = useState<ItemType | null>(null);
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
  const [evaluating, setEvaluating] = useState(false);

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
        setItems(await generateItems(mode, initialDifficulty, initialLevelSlice.levels, count, interests));
      } catch (err) {
        // A floor-alarmed type is stopped entirely — falling back to
        // hardcoded items would defeat that, so show a paused notice instead.
        if (err instanceof FloorAlarmError) {
          setBlockedType(err.blockedType as ItemType);
        } else {
          setItems(pickFallbackItems(mode, initialDifficulty, count));
        }
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
    const currentItem = items[itemIdx];
    const question = currentItem?.questions[0];
    const readText = [currentItem?.scenario, question?.stem, question?.text].filter(Boolean).join(' ');
    const minMs = calcReadTime(readText);
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
    // Difficulty/mastery/floor-alarm are decided server-side from the
    // cross-session rolling window (see api/recompute-difficulty.ts) — not
    // from this session's own raw score.
    let newDifficulty = initialDifficulty;
    let newlyAlarmedType: ItemType | null = null;
    try {
      const result = await recomputeDifficulty([...affectedTypes]);
      newDifficulty = result.difficulty;
      const newlyAlarmed = affectedTypes.filter(t => result.floorAlarm[t]);
      if (newlyAlarmed.length > 0) newlyAlarmedType = newlyAlarmed[0];
    } catch (err) {
      console.error('recomputeDifficulty failed:', err);
    }
    setFloorAlarmNotice(newlyAlarmedType);

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
      difficultySnapshot: newDifficulty,
      avgResponseMs,
    });
    setDone(true);
  }, [mode, score, maxScore, itemIdx, levelSlice, affectedTypes, initialDifficulty]);

  // ── Early returns (after all hooks) ──────────────────────────────────────

  if (done) {
    return (
      <FinishedScreen
        score={score} maxScore={maxScore} mode={mode}
        coinsEarned={coinsEarned}
        journalDone={journalDone}
        floorAlarmNotice={floorAlarmNotice}
        onGoHome={onComplete}
      />
    );
  }

  if (blockedType) {
    return (
      <div className="min-h-screen bg-paper flex items-center justify-center px-4">
        <div className="bg-surface rounded-[4px] shadow-[var(--shadow-raised)] p-8 max-w-sm w-full text-center space-y-4">
          <p className="text-base font-semibold text-ink">This practice is paused for now.</p>
          <p className="text-sm text-muted">Your parent can see more about this on their dashboard.</p>
          <button onClick={onExit}
            className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors">
            Back to home
          </button>
        </div>
      </div>
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
  const effectiveLevel  = hintActive ? 3 : currentLevel;

  // ── Handlers ─────────────────────────────────────────────────────────────

  const handleUseHint = async () => {
    const ok = await spendHintToken();
    if (ok) { setHintTokens(t => t - 1); setHintActiveQ(`${itemIdx}`); }
  };

  const handleAnswer = async (answer: string) => {
    const correctAnswer = currentQuestion.choices?.[0] ?? '';
    let result: AnswerResult;
    let feedbackText: string;
    let optionCount: number | null;

    if (effectiveLevel === 3) {
      const ok = answer === correctAnswer;
      result = ok ? 'correct' : 'incorrect';
      feedbackText = ok ? 'That is right.' : `The best answer is: "${correctAnswer}"`;
      optionCount = 3;
    } else if (effectiveLevel === 2) {
      const ok = currentQuestion.wordBank?.find(w => w.text === answer)?.correct ?? false;
      result = ok ? 'correct' : 'incorrect';
      feedbackText = ok ? 'That is right.' : `The best answer is: "${correctAnswer}"`;
      optionCount = currentQuestion.wordBank?.length ?? null;
    } else {
      setEvaluating(true);
      const ev = await evaluateFreeText(answer, correctAnswer, currentItem.scenario, currentQuestion.text);
      setEvaluating(false);
      result = ev.result;
      feedbackText = ev.feedback;
      optionCount = null;
    }

    totalResponseMsRef.current += Date.now() - questionStartRef.current;
    answeredCountRef.current   += 1;

    setScore(s => +(s + scoreForResult(result)).toFixed(1));
    setMaxScore(s => s + 1);
    setFeedback({ result, text: feedbackText });
    dispatchLevel({ type: 'RECORD', itemType: currentItem.type, result });
    void recordAttempt(currentItem.type, effectiveLevel, currentItem.difficulty, optionCount, result);
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
  const SUPPORT_LABELS: Record<SupportLevel, string> = { 3: 'Most help', 2: 'Word bank', 1: 'Some help', 0: 'Open question' };

  return (
    <div className="min-h-screen bg-paper flex flex-col">

      {/* Top bar — quiet on purpose, the passage below is the hero */}
      <div className="sticky top-0 z-10 bg-paper/95 backdrop-blur-sm border-b border-rule">
        <div className="max-w-[70ch] mx-auto px-4 md:px-6 py-3 flex items-center gap-4">
          <button onClick={() => { stop(); onExit(); }}
            className="text-muted hover:text-ink transition-colors p-1 -ml-1">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
          <div className="flex gap-1.5 flex-1">
            {items.map((_, i) => (
              <div key={i} className={`h-1 flex-1 rounded-[4px] transition-all duration-500
                ${i < itemIdx ? 'bg-accent' : i === itemIdx ? 'bg-accent/40' : 'bg-rule'}`} />
            ))}
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-muted">{itemIdx + 1} / {items.length}</span>
            <span className="text-ink font-semibold tabular-nums">{score} pts</span>
          </div>
        </div>
      </div>

      {/* Meta row */}
      <div className="max-w-[70ch] mx-auto w-full px-4 md:px-6 pt-6 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-muted">
          {TYPE_LABELS[currentItem.type]}
        </span>
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>{DIFF_LABELS[currentItem.difficulty]}</span>
          <span>·</span>
          <span>{SUPPORT_LABELS[currentLevel]}</span>
        </div>
      </div>

      {/* The passage — the hero. A book page, not an app card: no border,
          generous margin, a real measure. */}
      <div className="max-w-[70ch] mx-auto w-full px-4 md:px-6 pt-6 pb-8">
        <HighlightedText
          text={currentItem.scenario}
          speakingText={speakingText}
          activeCharIndex={activeCharIndex}
          className="font-serif text-[19px] leading-[1.75] text-ink"
        />
        <div className="mt-4">
          <SpeakButton text={currentItem.scenario} speak={speak} stop={stop} speakingText={speakingText} />
        </div>
      </div>

      {/* Question / evidence — the workspace beneath the page, given just
          enough separation (one shadow, no heavy border) to read as
          distinct from the passage above it. */}
      <div className="flex-1 max-w-[70ch] mx-auto w-full px-4 md:px-6 pb-8">
        <div className="bg-surface rounded-[4px] shadow-[var(--shadow-raised)] px-6 py-6">
          <QuestionPanel
            key={`item-${itemIdx}`}
            scenario={currentItem.scenario}
            questionText={currentQuestion.text}
            stem={currentQuestion.stem}
            choices={currentQuestion.choices}
            evidence={currentQuestion.evidence}
            wordBank={currentQuestion.wordBank}
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
            evaluating={evaluating}
            onSubmit={handleAnswer}
            feedback={feedback}
            onNext={handleEvidenceConfirm}
          />
        </div>
      </div>

    </div>
  );
}
