// Development-only adapter. Production still runs the original api/*.ts
// handlers on Vercel; no alternate auth or business logic lives here.
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Connect, Plugin } from 'vite';

const ROUTES = new Set([
  '/api/carryover', '/api/health',
  '/api/kid-login', '/api/create-student', '/api/conversation',
  '/api/evaluate-answer', '/api/record-attempt', '/api/recompute-difficulty',
  '/api/items/generate', '/api/profile/extract', '/api/profile/save',
]);
const MAX_BODY_BYTES = 1024 * 1024;
type Handler = (req: VercelRequest, res: VercelResponse) => unknown;
type LoadHandler = (file: string) => Promise<{ default: Handler }>;

function json(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function readBody(req: IncomingMessage): Promise<{ body?: unknown; tooLarge?: boolean }> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  let tooLarge = false;
  for await (const chunk of req) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES) tooLarge = true;
    if (!tooLarge) chunks.push(buffer);
  }
  if (tooLarge) return { tooLarge: true };
  const text = Buffer.concat(chunks).toString('utf8');
  return { body: text.trim() ? JSON.parse(text) : undefined };
}

export function createLocalApiMiddleware(loadHandler: LoadHandler): Connect.NextHandleFunction {
  return async (req, res, next) => {
    const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
    if (pathname !== '/api' && !pathname.startsWith('/api/')) return next();
    if (!ROUTES.has(pathname)) return json(res, 404, { error: 'API route not found' });
    if ((pathname==='/api/health' && req.method!=='GET') || (pathname!=='/api/health' && req.method !== 'POST')) return json(res, 405, { error: 'Method not allowed' });

    let parsed: Awaited<ReturnType<typeof readBody>>;
    try { parsed = await readBody(req); }
    catch { return json(res, 400, { error: 'Invalid JSON body' }); }
    if (parsed.tooLarge) return json(res, 413, { error: 'Request body too large' });

    const request = Object.assign(req, { body: parsed.body }) as VercelRequest;
    const response = Object.assign(res, {
      status(code: number) { res.statusCode = code; return response; },
      json(body: unknown) { json(res, res.statusCode, body); return response; },
    }) as VercelResponse;

    try {
      // The allowlist prevents arbitrary imports. The Vite server loader
      // resolves TypeScript and reloads changed handlers during development.
      const { default: handler } = await loadHandler(`${pathname}.ts`);
      await handler(request, response);
    } catch {
      // Do not log credentials, request bodies, or student content.
      if (!res.headersSent) json(res, 500, { error: 'Local API failed; check server configuration' });
      else if (!res.writableEnded) res.end();
    }
  };
}

export function localApiPlugin(): Plugin {
  return {
    name: 'ashi-local-api',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(createLocalApiMiddleware(async file => {
        const module = await server.ssrLoadModule(file);
        if (typeof module.default !== 'function') throw new Error('Missing API handler');
        return { default: module.default as Handler };
      }));
    },
  };
}
