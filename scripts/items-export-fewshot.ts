// Formats reviewed items as ready-to-paste blocks for
// api/items/generate.ts's prompt: the N most recent passes as few-shot
// examples, and fails grouped by failure code as anti-examples.
//
// Run via: npm run items:export-fewshot -- --limit=10

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import type { Item } from '../src/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS_FILE = path.join(ROOT, 'review', 'results.jsonl');
const BATCHES_DIR = path.join(ROOT, 'review', 'batches');
const OUT_FILE = path.join(ROOT, 'review', 'fewshot-export.md');

const FAIL_CODES: Record<number, string> = {
  1: 'Not inference — answer stated directly in the text',
  2: 'Ambiguous',
  3: 'Requires outside knowledge',
  4: "Clue sentence doesn't support the answer",
  5: 'Wrong reading level or age register',
  6: 'Figurative language in the question itself',
  7: 'Weak or defensible distractor',
  8: 'No clear problem / culturally variable cue',
};

interface ResultLine {
  itemId: string;
  batchFile: string;
  type: string;
  difficulty: number;
  verdict: 'pass' | 'fail';
  code?: number;
  note?: string;
  reviewedAt: string;
}

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function loadResults(): ResultLine[] {
  if (!existsSync(RESULTS_FILE)) return [];
  return readFileSync(RESULTS_FILE, 'utf-8').split('\n').filter(l => l.trim()).map(l => JSON.parse(l));
}

const batchCache = new Map<string, Item[]>();
function findItem(batchFile: string, itemId: string): Item | undefined {
  if (!batchCache.has(batchFile)) {
    const filePath = path.join(BATCHES_DIR, batchFile);
    if (!existsSync(filePath)) { batchCache.set(batchFile, []); }
    else batchCache.set(batchFile, JSON.parse(readFileSync(filePath, 'utf-8')).items);
  }
  return batchCache.get(batchFile)!.find(i => i.id === itemId);
}

function formatItem(item: Item): string {
  const q = item.questions[0];
  const lines = [
    `Scenario: ${item.scenario}`,
    `Question: ${q.text}`,
    `Correct answer: ${q.choices?.[0] ?? '(free response — no fixed choice)'}`,
    `Evidence: ${q.evidence}`,
  ];
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const limit = Number.parseInt(args.limit ?? '20', 10);

  const results = loadResults();
  if (results.length === 0) {
    console.log('No results yet — run `npm run items:review` first.');
    return;
  }

  const passes = results
    .filter(r => r.verdict === 'pass')
    .sort((a, b) => (a.reviewedAt < b.reviewedAt ? 1 : -1))
    .slice(0, limit);

  const fails = results.filter(r => r.verdict === 'fail' && r.code);
  const failsByCode = new Map<number, ResultLine[]>();
  for (const f of fails) {
    if (!failsByCode.has(f.code!)) failsByCode.set(f.code!, []);
    failsByCode.get(f.code!)!.push(f);
  }

  const sections: string[] = [];
  sections.push(`# Few-shot export (${new Date().toISOString()})\n`);

  sections.push(`## Good examples (${passes.length} most recent passes)\n`);
  for (const r of passes) {
    const item = findItem(r.batchFile, r.itemId);
    if (!item) continue;
    sections.push(`### ${item.type}, difficulty ${item.difficulty}\n\`\`\`\n${formatItem(item)}\n\`\`\`\n`);
  }

  sections.push(`## Avoid — grouped by failure code\n`);
  for (const [code, group] of [...failsByCode.entries()].sort((a, b) => b[1].length - a[1].length)) {
    sections.push(`### Code ${code}: ${FAIL_CODES[code] ?? 'unknown'} (${group.length} instance${group.length === 1 ? '' : 's'})\n`);
    for (const r of group) {
      const item = findItem(r.batchFile, r.itemId);
      if (!item) continue;
      sections.push(`\`\`\`\n${formatItem(item)}\n\`\`\`${r.note ? `\n> Note: ${r.note}` : ''}\n`);
    }
  }

  const output = sections.join('\n');
  writeFileSync(OUT_FILE, output);
  console.log(output);
  console.log(`\n(also written to review/fewshot-export.md)`);
}

main();
