import type { AnswerResult } from './types';
import { callApi } from './api';

// Judges the student's free-text answer for meaning via the model
// (api/evaluate-answer.ts) — there are many valid ways to phrase a correct
// answer, so this is not a string/keyword match. Falls back to a local
// keyword-overlap heuristic only if the request itself fails (network,
// rate limit, malformed model output), so a flaky connection never blocks
// the practice flow.
export async function evaluateFreeText(
  answer: string,
  correctAnswer: string,
  scenario: string,
  questionText: string,
): Promise<{ result: AnswerResult; feedback: string }> {
  try {
    return await callApi<{ result: AnswerResult; feedback: string }>('/api/evaluate-answer', {
      scenario, questionText, correctAnswer, userAnswer: answer,
    });
  } catch (err) {
    console.error('Free-text evaluation failed, using local fallback:', err);
    return evaluateFreeTextLocally(answer, correctAnswer);
  }
}

function evaluateFreeTextLocally(
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
