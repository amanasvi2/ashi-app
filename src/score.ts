import type { AnswerResult } from './types';
import { callApi } from './api';

// A failed evaluator must not guess a grade from keyword overlap. The caller
// keeps the answer retryable and records no attempt until evaluation succeeds.
export async function evaluateFreeText(
  answer: string,
  correctAnswer: string,
  scenario: string,
  questionText: string,
): Promise<{ result: AnswerResult; feedback: string }> {
  try {
    const result = await callApi<{ result: AnswerResult; feedback: string }>('/api/evaluate-answer', {
      scenario, questionText, correctAnswer, userAnswer: answer,
    });
    if (!['correct','partial','incorrect'].includes(result.result) || typeof result.feedback !== 'string' || !result.feedback.trim()) throw new Error('Invalid evaluation');
    return result;
  } catch {
    throw new Error('We couldn’t check that answer. Try again, or take a break. Your answer has not been scored.');
  }
}

export function scoreForResult(result: AnswerResult): number {
  if (result === 'correct') return 1;
  if (result === 'partial') return 0.5;
  return 0;
}
