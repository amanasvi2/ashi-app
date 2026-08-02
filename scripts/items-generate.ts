// Batch-generates practice items against the REAL production prompt
// (api/items/generate.ts's buildPrompt/isValidItem) so what you review is
// exactly what would ship — no reimplementation to drift out of sync.
//
// Run via: npm run items:generate -- --type=inference --count=10 --difficulty=2 --level=1 [--profile=gamer]

import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { buildPrompt, isValidItem } from '../api/items/generate.ts';
import { groqChat } from '../server/groq.ts';
import type { ItemType, Difficulty, SupportLevel, LevelState } from '../src/types.ts';

const ROOT = path.resolve(import.meta.dirname, '..');

function parseArgs(argv: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const arg of argv) {
    const m = arg.match(/^--([^=]+)=(.*)$/);
    if (m) out[m[1]] = m[2];
  }
  return out;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const type = args.type as ItemType;
  if (!['social', 'nonverbal', 'inference'].includes(type)) {
    fail('--type is required and must be one of: social, nonverbal, inference');
  }

  const count = Number.parseInt(args.count ?? '', 10);
  if (!Number.isInteger(count) || count < 1) fail('--count is required and must be a positive integer');

  const difficulty = Number.parseInt(args.difficulty ?? '2', 10) as Difficulty;
  if (![1, 2, 3].includes(difficulty)) fail('--difficulty must be 1, 2, or 3');

  const level = Number.parseInt(args.level ?? '3', 10) as SupportLevel;
  if (![0, 1, 2, 3].includes(level)) fail('--level must be 0, 1, 2, or 3');

  const profileName = args.profile;
  let interests: string[] = [];
  if (profileName) {
    const fixturePath = path.join(ROOT, 'review', 'fixtures', `${profileName}.json`);
    if (!existsSync(fixturePath)) fail(`No fixture at review/fixtures/${profileName}.json`);
    const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'));
    interests = fixture.interests ?? [];
  }

  const requests = Array.from({ length: count }, () => ({ type, difficulty }));
  // Only levels[type] is ever read (for the needsWordBank flag) — the
  // other two entries are unused for a single-type batch like this.
  const levels: LevelState = { social: level, nonverbal: level, inference: level };

  console.log(`Generating ${count} "${type}" item(s) — difficulty ${difficulty}, level ${level}${profileName ? `, profile "${profileName}"` : ''}...`);

  const prompt = buildPrompt(requests, levels, interests);
  const text = await groqChat([{ role: 'user', content: prompt }], { temperature: 0.85, maxTokens: 4096 });

  const jsonMatch = text.match(/\[[\s\S]*\]/);
  if (!jsonMatch) {
    console.error('Raw response:', text);
    fail('No JSON array found in the Groq response.');
  }

  const parsed: unknown = JSON.parse(jsonMatch[0]);
  if (!Array.isArray(parsed)) fail('Parsed response is not an array.');

  const expectedDifficulty: Partial<Record<ItemType, Difficulty>> = { [type]: difficulty };
  const valid = parsed.filter(item => isValidItem(item, levels, expectedDifficulty));
  const invalidCount = parsed.length - valid.length;
  if (valid.length === 0) fail('No valid items in the response — nothing written.');

  const items = valid.map((item, i) => ({ ...item, id: `gen_${Date.now()}_${i}` }));

  const batchesDir = path.join(ROOT, 'review', 'batches');
  mkdirSync(batchesDir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `${type}-d${difficulty}-l${level}-${timestamp}.json`;

  writeFileSync(
    path.join(batchesDir, filename),
    JSON.stringify({
      items,
      meta: {
        type, difficulty, level,
        profile: profileName ?? null,
        requestedCount: count,
        invalidCount,
        generatedAt: new Date().toISOString(),
      },
    }, null, 2),
  );

  console.log(`Wrote ${items.length} item(s) (${invalidCount} rejected by validation) to review/batches/${filename}`);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
