import { verifyUser } from '../server/verifyUser';
import { groqChatStream, type ChatMessage } from '../server/groq';

// Edge runtime so we can stream the response straight through to the
// browser instead of buffering the whole reply.
export const config = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
  try {
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const user = await verifyUser(req.headers.get('authorization') ?? undefined);
    if (!user) return new Response('Unauthorized', { status: 401 });

    const { messages, maxTokens } = (await req.json()) as { messages: ChatMessage[]; maxTokens?: number };
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response('Missing messages', { status: 400 });
    }

    const groqRes = await groqChatStream(messages, { maxTokens });
    if (!groqRes.ok || !groqRes.body) {
      return new Response('Conversation request failed', { status: 502 });
    }

    return new Response(groqRes.body, {
      headers: { 'Content-Type': 'text/event-stream' },
    });
  } catch (err) {
    console.error(err);
    const message = err instanceof Error ? err.message : 'Conversation request failed';
    return new Response(message, { status: 500 });
  }
}
