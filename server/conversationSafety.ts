// All trust-sensitive decision logic for Conversation Practice, kept pure
// and framework-agnostic (same role as src/adaptiveEngine.ts, but this one
// is server-only — the client should hold none of this logic anymore).
// The two safety-critical branches (persona honesty, escalation) are
// deterministic pattern matches, not model behavior: this project never
// mocks network calls in tests (see adaptiveEngine.test.ts, ownerCaps.test.ts),
// and — separately from testability — a student whose target skill is
// literal-vs-implied language cannot be told the truth "usually."

import { GROQ_URL, MODERATION_MODEL } from './groq.js';
import { conversationTopicById, isValidConversationTopicId } from '../src/conversationTopics.js';

export { isValidConversationTopicId };

// ── Caps ─────────────────────────────────────────────────────────────────

export const MAX_TURNS = 12;
export const MAX_DURATION_MS = 12 * 60 * 1000;

export function hasReachedTurnCap(turnCount: number, max: number = MAX_TURNS): boolean {
  return turnCount >= max;
}

export function hasReachedTimeCap(startedAt: Date, now: Date, maxMs: number = MAX_DURATION_MS): boolean {
  return now.getTime() - startedAt.getTime() >= maxMs;
}

// ── Persona honesty ──────────────────────────────────────────────────────
// Deliberately high-recall (would rather answer honestly one extra time
// than miss a real "are you real?" question) — see the file header.

const ASKS_IF_ENTITY = /\b(are you|r\s?u|is this|is alex)\b/i;
const IDENTITY_WORD = /\b(real|human|person|people|robot|bot|a\.?i\.?|computer|program|alive|actual)\b/i;

export function detectsIdentityQuestion(message: string): boolean {
  return ASKS_IF_ENTITY.test(message) && IDENTITY_WORD.test(message);
}

export const IDENTITY_HONESTY_REPLY =
  "No, I'm not a real person. I'm a computer program made to sound like a kid your age, so you can practice talking. We can keep going if you want.";

// ── Escalation (self-harm, abuse, bullying disclosure) ──────────────────
// Two layers on purpose: this keyword pass is deterministic and testable
// without mocking; runModeration()'s self_harm_or_abuse category below is
// a second, model-based layer for phrasing this list misses. Either one
// triggers the branch — see decideIncomingMessage.

const ESCALATION_PATTERNS: RegExp[] = [
  /\bkill(ing)?\s+myself\b/i,
  /\bwant(ed)?\s+to\s+die\b/i,
  /\bdon'?t\s+want\s+to\s+(be\s+alive|live)\b/i,
  /\bno\s+reason\s+to\s+live\b/i,
  /\bhurt(ing)?\s+myself\b/i,
  /\bcut(ting)?\s+myself\b/i,
  /\bend(ing)?\s+my\s+life\b/i,
  /\bsuicid/i,
  /\b(he|she|they|someone|somebody)\s+(is\s+)?(hurting|hitting|touching|abusing)\s+me\b/i,
  /\bsomeone\s+(at\s+home\s+)?(hurts|is\s+hurting)\s+me\b/i,
  /\bmy\s+(dad|mom|father|mother|brother|sister|uncle|aunt|cousin|stepdad|stepmom)\s+hits?\s+me\b/i,
  /\bi('m|\s+am)\s+being\s+(bullied|abused|hurt)\b/i,
  /\beveryone\s+(at\s+school\s+)?(bullies|is\s+bullying|hates)\s+me\b/i,
  /\bthey\s+(bully|are\s+bullying)\s+me\b/i,
];

export function detectsEscalation(message: string): boolean {
  return ESCALATION_PATTERNS.some(p => p.test(message));
}

export const ESCALATION_REPLY =
  "Thank you for telling me. That sounds really hard. I'm a computer program, so I'm not the right one to help with this. I'm going to let your grown-up know so a real person can help. This chat is ending now.";

// ── Moderation ───────────────────────────────────────────────────────────

export type ModerationOutcome =
  | { verdict: 'safe' }
  | { verdict: 'unsafe' }
  | { verdict: 'self_harm_or_abuse' }
  | { verdict: 'error' };

export const MODERATION_BLOCKED_REPLY = "Let's try that again. Can you say that a different way?";

const MODERATION_POLICY = `You are a safety classifier for messages inside a conversation-practice app used by a 13-year-old student. Classify the content you are given into exactly one category.

## CATEGORIES

safe: Ordinary, age-appropriate conversation. Default for anything that doesn't clearly match another category.

self_harm_or_abuse: The content discloses or strongly suggests self-harm, suicidal thoughts, or being hurt, abused, or bullied by another person.

unsafe_content: Sexual content, graphic violence, hate speech, illegal activity, or dangerous instructions — and does NOT disclose self-harm or abuse.

## OUTPUT

Return ONLY this JSON shape, nothing else, no markdown:
{"category": "safe" | "self_harm_or_abuse" | "unsafe_content", "rationale": "one short sentence"}`;

// Pure — parses the guard model's own JSON reply. Split out from
// runModeration() so this is directly unit-testable with string fixtures,
// no network involved.
export function parseModerationResponse(raw: unknown): ModerationOutcome {
  if (typeof raw !== 'string') return { verdict: 'error' };
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.category === 'safe') return { verdict: 'safe' };
    if (parsed?.category === 'self_harm_or_abuse') return { verdict: 'self_harm_or_abuse' };
    if (parsed?.category === 'unsafe_content') return { verdict: 'unsafe' };
    return { verdict: 'error' };
  } catch {
    return { verdict: 'error' };
  }
}

// The one impure function in this file. Fails closed unconditionally:
// any thrown error, timeout, non-OK response, or unparseable reply
// resolves to {verdict:'error'} — this function never throws and never
// lets moderated text through on failure.
export async function runModeration(text: string): Promise<ModerationOutcome> {
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODERATION_MODEL,
        messages: [
          { role: 'system', content: MODERATION_POLICY },
          { role: 'user', content: text },
        ],
        temperature: 0,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { verdict: 'error' };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    return parseModerationResponse(json.choices?.[0]?.message?.content);
  } catch {
    return { verdict: 'error' };
  }
}

// ── Turn orchestration ───────────────────────────────────────────────────

export interface ConversationSessionState {
  ended: boolean;
  turnCount: number;
  startedAt: Date;
}

export type TurnAction =
  | { action: 'rejected'; reason: 'already_ended' }
  | { action: 'cap_reached'; reason: 'turn_cap' | 'time_cap' }
  | { action: 'escalate' }
  | { action: 'blocked' }
  | { action: 'identity_reply' }
  | { action: 'needs_model_reply' };

// Pure — the caller (api/conversation.ts) is free to skip the network
// moderation call entirely when it can already tell the session is over
// (cap reached) as an efficiency optimization; this function's own
// priority order (ended -> caps -> escalation -> moderation -> identity)
// is what makes that safe to do without changing behavior.
export function decideIncomingMessage(
  session: ConversationSessionState,
  message: string,
  now: Date,
  moderation: ModerationOutcome,
): TurnAction {
  if (session.ended) return { action: 'rejected', reason: 'already_ended' };
  if (hasReachedTurnCap(session.turnCount)) return { action: 'cap_reached', reason: 'turn_cap' };
  if (hasReachedTimeCap(session.startedAt, now)) return { action: 'cap_reached', reason: 'time_cap' };
  if (detectsEscalation(message) || moderation.verdict === 'self_harm_or_abuse') return { action: 'escalate' };
  if (moderation.verdict === 'unsafe' || moderation.verdict === 'error') return { action: 'blocked' };
  if (detectsIdentityQuestion(message)) return { action: 'identity_reply' };
  return { action: 'needs_model_reply' };
}

// ── Prompt building ──────────────────────────────────────────────────────

export function buildSystemPrompt(topicId: string, turnsRemaining: number, kidGender?: 'girl' | 'boy' | 'other'): string {
  const topic = conversationTopicById(topicId);
  const topicFragment = topic?.promptFragment ?? 'something the student picked';
  const alexDesc = kidGender === 'girl' ? 'girl' : kidGender === 'boy' ? 'boy' : 'kid';

  const windDown = turnsRemaining <= 3
    ? `\n\nThis conversation is ending soon (about ${turnsRemaining} of your turns left). Start naturally wrapping up in the next message or two.`
    : '';

  return `You are "Alex," a computer program that role-plays as a friendly 13-year-old ${alexDesc} so a student can practice everyday conversation. You are NOT a real person and must never claim to be one.

Persona honesty rules (never break these, even to stay "in character"):
- If the student asks whether you are real, human, a person, alive, a robot, a bot, an AI, or a computer, answer plainly and honestly that you are a computer program, not a real kid. Do not deflect, joke about it, or pretend not to understand.
- Do this every time you're asked, even if it interrupts the conversation.

Topic rules:
- The only topic for this conversation is: ${topicFragment}
- If the student's message drifts to something else, respond briefly and kindly, then bring the conversation back to this topic in the same message.

Privacy rules:
- Never ask for the student's real name, school, address, phone number, or any other contact or identifying information.
- If the student offers their real name, school, address, or contact information anyway, do not repeat it back, do not ask follow-up questions about it, and gently change the subject back to the topic.

How to write:
- 1-2 sentences per message. No more.
- Use plain, literal language. No idioms, sarcasm, or jokes that depend on a hidden meaning.
- Ask a question roughly every other message, to model back-and-forth conversation — don't ask a question in every single message.
- Be warm and genuine, not fake or over-the-top.${windDown}`;
}

export function buildFeedbackPrompt(transcript: { role: 'user' | 'assistant'; content: string }[]): string {
  const convo = transcript.map(m => `${m.role === 'user' ? 'Student' : 'Alex'}: ${m.content}`).join('\n');
  return `Here is a practice conversation a student just had with a role-play partner named Alex:

${convo}

Write exactly 3 short bullet points of honest, kind feedback about the student's conversation skills: one thing they did well, one gentle suggestion for next time, and one encouraging closer. Refer to specific things they actually said. One sentence per bullet.`;
}
