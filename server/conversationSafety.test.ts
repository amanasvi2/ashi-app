import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  MAX_TURNS, MAX_DURATION_MS, hasReachedTurnCap, hasReachedTimeCap,
  detectsIdentityQuestion, IDENTITY_HONESTY_REPLY,
  detectsEscalation, ESCALATION_REPLY,
  isValidConversationTopicId,
  buildSystemPrompt,
  parseModerationResponse, runModeration,
  decideIncomingMessage,
  type ConversationSessionState,
} from './conversationSafety';

// ── 1. Persona honesty ──────────────────────────────────────────────────

describe('detectsIdentityQuestion', () => {
  it('catches every required phrasing', () => {
    expect(detectsIdentityQuestion('are you a real kid')).toBe(true);
    expect(detectsIdentityQuestion('are you human')).toBe(true);
    expect(detectsIdentityQuestion('are you an AI')).toBe(true);
    expect(detectsIdentityQuestion('is this a bot')).toBe(true);
    expect(detectsIdentityQuestion('are you actually a person')).toBe(true);
  });

  it('does not fire on ordinary messages, including ones that share a word', () => {
    expect(detectsIdentityQuestion('are you going to the game')).toBe(false);
    expect(detectsIdentityQuestion('I like basketball')).toBe(false);
    expect(detectsIdentityQuestion('my dog is so real cute')).toBe(false);
  });

  it('exposes a single, unvarying honest reply', () => {
    expect(IDENTITY_HONESTY_REPLY).toMatch(/computer program/i);
    expect(IDENTITY_HONESTY_REPLY).not.toMatch(/real (person|kid)$/i);
  });
});

// ── 2. Topic redirect ────────────────────────────────────────────────────

describe('topic allowlist', () => {
  it('accepts exactly the 7 allowed topics', () => {
    for (const id of ['shows', 'sports', 'music', 'games', 'school', 'pets', 'food']) {
      expect(isValidConversationTopicId(id)).toBe(true);
    }
  });

  it('rejects the dropped topics and anything unknown', () => {
    expect(isValidConversationTopicId('weekend')).toBe(false);
    expect(isValidConversationTopicId('funny')).toBe(false);
    expect(isValidConversationTopicId('anything-else')).toBe(false);
  });

  it('every topic\'s system prompt contains a stay-on-topic redirect instruction', () => {
    for (const id of ['shows', 'sports', 'music', 'games', 'school', 'pets', 'food']) {
      const prompt = buildSystemPrompt(id, MAX_TURNS);
      expect(prompt).toMatch(/only topic for this conversation/i);
      expect(prompt).toMatch(/bring the conversation back/i);
    }
  });
});

// ── 3. Turn cap / time cap ───────────────────────────────────────────────

describe('caps', () => {
  it('turn cap triggers at and above the max, not before', () => {
    expect(hasReachedTurnCap(MAX_TURNS - 1)).toBe(false);
    expect(hasReachedTurnCap(MAX_TURNS)).toBe(true);
    expect(hasReachedTurnCap(MAX_TURNS + 1)).toBe(true);
  });

  it('time cap triggers at and after the max duration, not before', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const justUnder = new Date(start.getTime() + MAX_DURATION_MS - 1000);
    const exactly = new Date(start.getTime() + MAX_DURATION_MS);
    expect(hasReachedTimeCap(start, justUnder)).toBe(false);
    expect(hasReachedTimeCap(start, exactly)).toBe(true);
  });

  it('decideIncomingMessage reports cap_reached before moderation is even consulted', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const cappedByTurns: ConversationSessionState = { ended: false, turnCount: MAX_TURNS, startedAt: now };
    // Passing a 'safe' verdict on purpose — the cap must win regardless.
    const result = decideIncomingMessage(cappedByTurns, 'hello', now, { verdict: 'safe' });
    expect(result).toEqual({ action: 'cap_reached', reason: 'turn_cap' });
  });

  it('reports the time-cap reason once the wall clock is exceeded', () => {
    const start = new Date('2026-01-01T00:00:00Z');
    const later = new Date(start.getTime() + MAX_DURATION_MS + 1);
    const session: ConversationSessionState = { ended: false, turnCount: 0, startedAt: start };
    expect(decideIncomingMessage(session, 'hello', later, { verdict: 'safe' })).toEqual({ action: 'cap_reached', reason: 'time_cap' });
  });
});

// ── 4. Moderation fail-closed ────────────────────────────────────────────

describe('parseModerationResponse', () => {
  it('parses each valid category', () => {
    expect(parseModerationResponse('{"category":"safe","rationale":"fine"}')).toEqual({ verdict: 'safe' });
    expect(parseModerationResponse('{"category":"self_harm_or_abuse","rationale":"x"}')).toEqual({ verdict: 'self_harm_or_abuse' });
    expect(parseModerationResponse('{"category":"unsafe_content","rationale":"x"}')).toEqual({ verdict: 'unsafe' });
  });

  it('fails closed on malformed or unexpected input', () => {
    expect(parseModerationResponse('not json at all')).toEqual({ verdict: 'error' });
    expect(parseModerationResponse('{"category":"something_unrecognized"}')).toEqual({ verdict: 'error' });
    expect(parseModerationResponse(undefined)).toEqual({ verdict: 'error' });
    expect(parseModerationResponse(42)).toEqual({ verdict: 'error' });
  });
});

describe('runModeration fail-closed on network failure', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('resolves to {verdict: "error"} — never throws, never passes content through — when the network call rejects', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')));
    await expect(runModeration('anything')).resolves.toEqual({ verdict: 'error' });
  });

  it('resolves to {verdict: "error"} on a non-OK response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(runModeration('anything')).resolves.toEqual({ verdict: 'error' });
  });
});

// ── 5. Escalation branch ─────────────────────────────────────────────────

describe('detectsEscalation', () => {
  it('catches direct self-harm, abuse, and bullying disclosures', () => {
    expect(detectsEscalation('I want to kill myself')).toBe(true);
    expect(detectsEscalation("I don't want to be alive anymore")).toBe(true);
    expect(detectsEscalation('my stepdad hits me')).toBe(true);
    expect(detectsEscalation('someone is hurting me at home')).toBe(true);
    expect(detectsEscalation('everyone at school bullies me')).toBe(true);
    expect(detectsEscalation("I've been cutting myself")).toBe(true);
  });

  it('does not fire on ordinary distress-adjacent-but-safe messages', () => {
    expect(detectsEscalation('I am sad my team lost the game')).toBe(false);
    expect(detectsEscalation('my sister is so annoying sometimes')).toBe(false);
    expect(detectsEscalation('my brother beat me at chess')).toBe(false);
    expect(detectsEscalation('I hate Mondays')).toBe(false);
  });

  it('exposes a fixed, warm, out-of-persona reply', () => {
    expect(ESCALATION_REPLY).toMatch(/grown-up/i);
    expect(ESCALATION_REPLY).toMatch(/computer program/i);
  });

  it('escalation wins even when the moderation verdict alone would only be a generic block', () => {
    const now = new Date();
    const session: ConversationSessionState = { ended: false, turnCount: 0, startedAt: now };
    const result = decideIncomingMessage(session, 'my stepdad hits me', now, { verdict: 'unsafe' });
    expect(result).toEqual({ action: 'escalate' });
  });

  it("the moderation model's own self_harm_or_abuse verdict escalates even if the keyword list misses the phrasing", () => {
    const now = new Date();
    const session: ConversationSessionState = { ended: false, turnCount: 0, startedAt: now };
    const result = decideIncomingMessage(session, 'something the keyword list would never catch', now, { verdict: 'self_harm_or_abuse' });
    expect(result).toEqual({ action: 'escalate' });
  });

  it('a session already ended by escalation rejects any further turn, regardless of what is said', () => {
    const now = new Date();
    const endedSession: ConversationSessionState = { ended: true, turnCount: 3, startedAt: now };
    expect(decideIncomingMessage(endedSession, 'hello again', now, { verdict: 'safe' }))
      .toEqual({ action: 'rejected', reason: 'already_ended' });
  });
});

// ── 6. No PII elicitation ────────────────────────────────────────────────

describe('buildSystemPrompt: no PII elicitation', () => {
  it('never instructs asking for identifying information', () => {
    const prompt = buildSystemPrompt('school', MAX_TURNS);
    expect(prompt.toLowerCase()).not.toMatch(/what'?s your (real )?name/);
    expect(prompt.toLowerCase()).not.toMatch(/what school do you go to/);
    expect(prompt.toLowerCase()).not.toMatch(/where do you live/);
  });

  it('explicitly forbids asking for name, school, location, or contact info', () => {
    const prompt = buildSystemPrompt('school', MAX_TURNS);
    expect(prompt).toMatch(/never ask for the student's real name/i);
    expect(prompt).toMatch(/school, address, phone number/i);
  });

  it('instructs changing the subject if the student volunteers it', () => {
    const prompt = buildSystemPrompt('school', MAX_TURNS);
    expect(prompt).toMatch(/gently change the subject/i);
  });
});
