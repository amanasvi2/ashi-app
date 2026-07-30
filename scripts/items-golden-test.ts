// Regression guard for the free-text scoring pipeline: runs every sample
// answer in review/golden/items.json through the REAL
// api/evaluate-answer.ts prompt + model call and checks the verdict
// matches what a human expects. Not part of `npm test` — ~90 real Groq
// calls is too slow/costly/nondeterministic for every `vitest run`, and
// LLM grading has some irreducible variance even at low temperature, so
// this checks aggregate accuracy against a threshold rather than
// requiring every single call to match exactly.
//
// Run via: npm run items:golden-test

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { buildPrompt, isValidResult } from '../api/evaluate-answer.ts';
import { groqChat, GroqRequestError } from '../server/groq.ts';
import type { Item } from '../src/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const ACCURACY_THRESHOLD = 0.85;
// ~90 real calls in a row trips Groq's per-minute rate limit well before
// finishing — a fixed gap between requests plus backoff-and-retry
// specifically on 429 keeps this reliable without needing a paid tier.
const REQUEST_GAP_MS = 500;
const MAX_RETRIES = 4;

interface GoldenItem extends Item {
  sampleAnswers: { text: string; expected: 'correct' | 'partial' | 'incorrect' }[];
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function evaluate(item: GoldenItem, answer: string): Promise<'correct' | 'partial' | 'incorrect' | 'error'> {
  const q = item.questions[0];
  const prompt = buildPrompt(item.scenario, q.text, q.choices![0], answer);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const text = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.3, maxTokens: 200 });
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return 'error';
      const parsed: unknown = JSON.parse(jsonMatch[0]);
      if (!isValidResult(parsed)) return 'error';
      return parsed.result;
    } catch (err) {
      const isRateLimit = err instanceof GroqRequestError && err.status === 429;
      if (!isRateLimit || attempt === MAX_RETRIES) return 'error';
      await sleep(2000 * (attempt + 1)); // 2s, 4s, 6s, 8s
    }
  }
  return 'error';
}

async function main() {
  const items: GoldenItem[] = JSON.parse(readFileSync(path.join(ROOT, 'review', 'golden', 'items.json'), 'utf-8'));
  const totalAnswers = items.reduce((sum, i) => sum + i.sampleAnswers.length, 0);
  console.log(`Running ${totalAnswers} sample answers across ${items.length} golden items against the real scoring pipeline...\n`);

  let correct = 0;
  let done = 0;
  const mismatches: { itemId: string; answer: string; expected: string; got: string }[] = [];

  for (const item of items) {
    for (const sample of item.sampleAnswers) {
      const got = await evaluate(item, sample.text);
      done++;
      if (got === sample.expected) {
        correct++;
      } else {
        mismatches.push({ itemId: item.id, answer: sample.text, expected: sample.expected, got });
      }
      process.stdout.write(`\r  ${done}/${totalAnswers} (${correct} matched)`);
      if (done < totalAnswers) await sleep(REQUEST_GAP_MS);
    }
  }
  console.log('\n');

  const accuracy = correct / totalAnswers;
  console.log(`Accuracy: ${(accuracy * 100).toFixed(1)}% (${correct}/${totalAnswers}), threshold ${(ACCURACY_THRESHOLD * 100).toFixed(0)}%\n`);

  if (mismatches.length > 0) {
    console.log('Mismatches:');
    for (const m of mismatches) {
      console.log(`  ${m.itemId}: expected "${m.expected}", got "${m.got}"`);
      console.log(`    answer: "${m.answer}"`);
    }
    console.log();
  }

  if (accuracy < ACCURACY_THRESHOLD) {
    console.error(`FAILED — accuracy below threshold.`);
    process.exit(1);
  }
  console.log('PASSED.');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
