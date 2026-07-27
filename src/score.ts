import type { AnswerResult } from './types';

// Evaluates a free-text answer against the correct answer string.
// This is intentionally simple — the spec calls for model-based evaluation later.
// "Correct" = answer contains the meaningful content words from the correct answer.
// "Partial"  = answer contains some of them.
// "Incorrect" = none found.
export function evaluateFreeText(
  answer: string,
  correctAnswer: string,
): { result: AnswerResult; feedback: string } {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);

  // Stop words to ignore when comparing
  const STOP = new Set([
    'a','an','the','is','was','are','were','be','been','being',
    'have','has','had','do','does','did','will','would','could','should',
    'may','might','shall','can','that','this','it','its','she','he','they',
    'her','his','their','and','or','but','so','if','as','at','by','for',
    'in','of','on','to','up','not','no','with',
  ]);

  const keywordsOf = (s: string) => normalize(s).filter(w => !STOP.has(w));

  const correctWords = keywordsOf(correctAnswer);
  const answerWords = new Set(keywordsOf(answer));

  if (correctWords.length === 0) {
    return { result: 'correct', feedback: 'Good answer.' };
  }

  const matchCount = correctWords.filter(w => answerWords.has(w)).length;
  const ratio = matchCount / correctWords.length;

  if (ratio >= 0.6) {
    return {
      result: 'correct',
      feedback: 'Good — you got the main idea.',
    };
  }
  if (ratio >= 0.3) {
    return {
      result: 'partial',
      feedback: `You got part of it. The full idea: "${correctAnswer}"`,
    };
  }
  return {
    result: 'incorrect',
    feedback: `Not quite. The answer is: "${correctAnswer}"`,
  };
}

export function scoreForResult(result: AnswerResult): number {
  if (result === 'correct') return 1;
  if (result === 'partial') return 0.5;
  return 0;
}
