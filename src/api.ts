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

export interface ConversationTurnResult {
  sessionId?: string;
  reply: string;
  ended: boolean;
  endedReason?: 'turn_cap' | 'time_cap' | 'escalation';
  feedback?: string;
  turnsRemaining: number;
}

// The server builds the entire prompt, runs both sides through moderation,
// and decides everything (topic lock, caps, persona honesty, escalation) —
// see server/conversationSafety.ts. The client only ever sends a topicId
// (to start) or a sessionId + message (to continue), and never sees
// anything before it's been moderated. Omit sessionId to start a new
// conversation on the given topicId; include it with a message to
// continue one.
export async function sendConversationTurn(
  args: { topicId: string } | { sessionId: string; message: string },
): Promise<ConversationTurnResult> {
  return callApi<ConversationTurnResult>('/api/conversation', args);
}
