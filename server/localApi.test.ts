// @vitest-environment node
import { createServer, type Server } from 'node:http';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createLocalApiMiddleware } from './localApi';
import type { VercelRequest, VercelResponse } from '@vercel/node';

describe('local API routing over HTTP', () => {
  let server: Server;
  let origin: string;
  const load = vi.fn<(file: string) => Promise<{
    default: (req: VercelRequest, res: VercelResponse) => unknown;
  }>>(async (_file: string) => ({
    default: (req: VercelRequest, res: VercelResponse) => res.status(201).json({
      body: req.body, authorization: req.headers.authorization,
    }),
  }));

  beforeEach(async () => {
    const middleware = createLocalApiMiddleware(load);
    server = createServer((req, res) => {
      void middleware(req, res, () => { res.end('frontend'); });
    });
    await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('Missing test port');
    origin = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close(err => err ? reject(err) : resolve()));
    load.mockClear();
  });

  it('passes frontend requests through to Vite', async () => {
    expect(await (await fetch(origin)).text()).toBe('frontend');
    expect(load).not.toHaveBeenCalled();
  });

  it('returns JSON for unknown API routes instead of the frontend HTML', async () => {
    const res = await fetch(`${origin}/api/not-a-route`);
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'API route not found' });
    expect(load).not.toHaveBeenCalled();
  });

  it('rejects unsupported methods without loading server clients', async () => {
    expect((await fetch(`${origin}/api/kid-login`)).status).toBe(405);
    expect(load).not.toHaveBeenCalled();
  });

  it('parses JSON and preserves the authorization header for the real handler', async () => {
    const res = await fetch(`${origin}/api/items/generate?ignored=true`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-only' },
      body: JSON.stringify({ count: 3 }),
    });
    expect(load).toHaveBeenCalledWith('/api/items/generate.ts');
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ body: { count: 3 }, authorization: 'Bearer test-only' });
  });

  it('rejects malformed JSON before invoking a handler', async () => {
    const res = await fetch(`${origin}/api/kid-login`, { method: 'POST', body: '{broken' });
    expect(res.status).toBe(400);
    expect(load).not.toHaveBeenCalled();
  });

  it('rejects oversized bodies before invoking a handler', async () => {
    const res = await fetch(`${origin}/api/kid-login`, {
      method: 'POST', body: JSON.stringify({ text: 'x'.repeat(1024 * 1024) }),
    });
    expect(res.status).toBe(413);
    expect(load).not.toHaveBeenCalled();
  });

  it('keeps the existing authentication check on a real endpoint', async () => {
    load.mockImplementationOnce(async () => import('../api/record-attempt'));
    const res = await fetch(`${origin}/api/record-attempt`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: 'Unauthorized' });
  });

  it('does not expose internal errors or their contents', async () => {
    load.mockRejectedValueOnce(new Error('private-content-must-not-leak'));
    const res = await fetch(`${origin}/api/conversation`, { method: 'POST', body: '{}' });
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain('private-content');
  });
  it('allows GET health without opening GET access to protected routes',async()=>{
    const result=await fetch(`${origin}/api/health`);
    expect(result.status).toBe(201);expect(load).toHaveBeenCalledWith('/api/health.ts');
  });
  it('rejects POST health so readiness checks remain read-only',async()=>{
    expect((await fetch(`${origin}/api/health`,{method:'POST',body:'{}'})).status).toBe(405);
    expect(load).not.toHaveBeenCalled();
  });

});
