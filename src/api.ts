import { supabase } from './supabase';

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Thrown by /api/items/generate when a type is floor-alarmed (maximum
// support + easiest content + still not succeeding) — callers should show
// a distinct "paused, ask your parent" message rather than silently
// falling back to hardcoded items like a generic failure would.
export class FloorAlarmError extends Error {
  blockedType: string;
  constructor(blockedType: string) {
    super(`Practice for "${blockedType}" is currently paused`);
    this.blockedType = blockedType;
  }
}

// POST helper for the JSON /api routes (item generation, IEP analysis, etc).
export async function callApi<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const errBody = await res.json().catch(() => null);
    if (errBody?.error === 'floor_alarm' && errBody?.blockedType) {
      throw new FloorAlarmError(errBody.blockedType);
    }
    throw new Error(`${path} failed: ${res.status} ${errBody?.error ?? ''}`);
  }
  return res.json();
}

export interface ConversationChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Streams /api/conversation and calls onDelta with each new chunk of text.
// Returns the full accumulated text once the stream ends.
export async function streamConversation(
  messages: ConversationChatMessage[],
  onDelta: (fullTextSoFar: string) => void,
  maxTokens?: number,
): Promise<string> {
  const res = await fetch('/api/conversation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify({ messages, maxTokens }),
  });
  if (!res.ok || !res.body) throw new Error(`Conversation request failed: ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let text = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice('data:'.length).trim();
      if (data === '[DONE]') continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content ?? '';
        if (delta) { text += delta; onDelta(text); }
      } catch { /* ignore partial/non-JSON keepalive lines */ }
    }
  }

  return text;
}
