// Reads review/results.jsonl and prints pass rate broken down by every
// generation parameter, plus failure-code frequency — the thing you
// actually want to watch: which params fail most, and why.

import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const RESULTS_FILE = path.join(ROOT, 'review', 'results.jsonl');

const FAIL_CODES = {
  1: 'not-inference', 2: 'ambiguous', 3: 'outside knowledge',
  4: 'evidence mismatch', 5: 'reading level/register', 6: 'figurative language',
  7: 'weak distractor', 8: 'no clear problem / cultural',
};

function loadResults() {
  if (!existsSync(RESULTS_FILE)) return [];
  return readFileSync(RESULTS_FILE, 'utf-8')
    .split('\n')
    .filter(l => l.trim())
    .map(l => JSON.parse(l));
}

function groupBy(results, keyFn) {
  const groups = new Map();
  for (const r of results) {
    const key = keyFn(r);
    if (!groups.has(key)) groups.set(key, { pass: 0, total: 0 });
    const g = groups.get(key);
    g.total++;
    if (r.verdict === 'pass') g.pass++;
  }
  return groups;
}

function printTable(title, groups) {
  console.log(`\n${title}`);
  console.log('-'.repeat(title.length));
  const keys = [...groups.keys()].sort();
  if (keys.length === 0) { console.log('(no data)'); return; }
  for (const key of keys) {
    const { pass, total } = groups.get(key);
    const rate = total > 0 ? ((pass / total) * 100).toFixed(0) : '0';
    console.log(`  ${String(key).padEnd(14)} ${String(pass).padStart(3)}/${String(total).padEnd(4)} (${rate}%)`);
  }
}

function main() {
  const results = loadResults();
  if (results.length === 0) {
    console.log('No results yet — run `npm run items:review` first.');
    return;
  }

  const passCount = results.filter(r => r.verdict === 'pass').length;
  console.log(`Total reviewed: ${results.length}  |  Pass rate: ${((passCount / results.length) * 100).toFixed(0)}%`);

  printTable('By type', groupBy(results, r => r.type));
  printTable('By difficulty', groupBy(results, r => `d${r.difficulty}`));
  printTable('By support level', groupBy(results, r => `l${r.level}`));

  console.log('\nFailure code frequency');
  console.log('-'.repeat(22));
  const fails = results.filter(r => r.verdict === 'fail' && r.code);
  if (fails.length === 0) {
    console.log('(no failures recorded)');
  } else {
    const counts = new Map();
    for (const r of fails) counts.set(r.code, (counts.get(r.code) ?? 0) + 1);
    [...counts.entries()].sort((a, b) => b[1] - a[1]).forEach(([code, count]) => {
      const pct = ((count / fails.length) * 100).toFixed(0);
      console.log(`  ${code}. ${(FAIL_CODES[code] ?? 'unknown').padEnd(26)} ${String(count).padStart(3)} (${pct}%)`);
    });
  }
}

main();
