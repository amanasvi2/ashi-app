// Local-only review server. Plain node:http, zero dependencies — never
// referenced by vite.config.ts or vercel.json, so none of this ships.
// Serves review/ui/ statically and exposes a tiny JSON file-backed API
// for the review UI: list batches, load one (annotated with what's
// already been reviewed, for resume), and append one result at a time.

import { createServer } from 'node:http';
import { readFile, readdir, appendFile, mkdir, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const BATCHES_DIR = path.join(ROOT, 'review', 'batches');
const RESULTS_FILE = path.join(ROOT, 'review', 'results.jsonl');
const UI_DIR = path.join(import.meta.dirname, 'ui');
const PORT = 4747;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };

async function readJson(res, body) {
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(body));
}

async function reviewedItemIds() {
  if (!existsSync(RESULTS_FILE)) return new Set();
  const text = await readFile(RESULTS_FILE, 'utf-8');
  const ids = new Set();
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try { ids.add(JSON.parse(line).itemId); } catch { /* skip a malformed line */ }
  }
  return ids;
}

async function listBatches() {
  await mkdir(BATCHES_DIR, { recursive: true });
  const files = (await readdir(BATCHES_DIR)).filter(f => f.endsWith('.json'));
  const withStats = await Promise.all(files.map(async f => {
    const s = await stat(path.join(BATCHES_DIR, f));
    const raw = JSON.parse(await readFile(path.join(BATCHES_DIR, f), 'utf-8'));
    return { file: f, meta: raw.meta, itemCount: raw.items.length, mtime: s.mtimeMs };
  }));
  return withStats.sort((a, b) => b.mtime - a.mtime);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);

    if (req.method === 'GET' && url.pathname === '/api/batches') {
      return readJson(res, await listBatches());
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/batch/')) {
      const file = decodeURIComponent(url.pathname.slice('/api/batch/'.length));
      const filePath = path.join(BATCHES_DIR, file);
      if (!filePath.startsWith(BATCHES_DIR) || !existsSync(filePath)) {
        res.statusCode = 404;
        return readJson(res, { error: 'Batch not found' });
      }
      const raw = JSON.parse(await readFile(filePath, 'utf-8'));
      const reviewed = await reviewedItemIds();
      const items = raw.items.map(item => ({ ...item, reviewed: reviewed.has(item.id) }));
      return readJson(res, { items, meta: raw.meta, file });
    }

    if (req.method === 'POST' && url.pathname === '/api/result') {
      const body = JSON.parse(await readBody(req));
      if (!body.itemId || !body.verdict) {
        res.statusCode = 400;
        return readJson(res, { error: 'Missing itemId or verdict' });
      }
      await mkdir(path.dirname(RESULTS_FILE), { recursive: true });
      await appendFile(RESULTS_FILE, JSON.stringify({ ...body, reviewedAt: new Date().toISOString() }) + '\n');
      return readJson(res, { ok: true });
    }

    // Static file serving for review/ui/
    let filePath = path.join(UI_DIR, url.pathname === '/' ? 'index.html' : url.pathname);
    if (!filePath.startsWith(UI_DIR)) { res.statusCode = 403; return res.end('Forbidden'); }
    if (!existsSync(filePath)) { res.statusCode = 404; return res.end('Not found'); }
    const ext = path.extname(filePath);
    res.setHeader('Content-Type', MIME[ext] ?? 'application/octet-stream');
    res.end(await readFile(filePath));
  } catch (err) {
    console.error(err);
    res.statusCode = 500;
    readJson(res, { error: err instanceof Error ? err.message : 'Server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Item review server: http://localhost:${PORT}`);
});
