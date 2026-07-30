// Server-only. Talks to Groq's OpenAI-compatible chat completions endpoint
// directly over fetch so the same helper works from both Node and Edge
// Vercel functions without depending on the groq-sdk's runtime assumptions.

export const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export const CONVERSATION_MODEL = 'llama-3.3-70b-versatile';

// Groq-hosted policy-following safety classifier. Replaces the now-
// deprecated meta-llama/llama-guard-4-12b (deprecated 2026-02-10) — see
// server/conversationSafety.ts for how the moderation policy is built and
// the response parsed.
export const MODERATION_MODEL = 'openai/gpt-oss-safeguard-20b';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Carries only the numeric HTTP status — a number can never leak request or
// response content, so this is always safe to log even for endpoints (like
// profile extraction) that must never log the underlying request text.
export class GroqRequestError extends Error {
  status: number;
  constructor(status: number) {
    super(`Groq request failed with status ${status}`);
    this.status = status;
  }
}

export async function groqChat(
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: CONVERSATION_MODEL,
      messages,
      temperature: opts.temperature ?? 0.7,
      max_tokens: opts.maxTokens ?? 1024,
    }),
  });

  if (!res.ok) throw new GroqRequestError(res.status);

  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content ?? '';
}
