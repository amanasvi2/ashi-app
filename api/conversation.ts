import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyUser } from '../server/verifyUser.js';
import { supabaseAsUser } from '../server/asUser.js';
import { groqChat, GroqRequestError } from '../server/groq.js';
import {
  MAX_TURNS, hasReachedTurnCap, hasReachedTimeCap,
  isValidConversationTopicId, buildSystemPrompt, buildFeedbackPrompt,
  runModeration, decideIncomingMessage,
  IDENTITY_HONESTY_REPLY, ESCALATION_REPLY, MODERATION_BLOCKED_REPLY,
  type ConversationSessionState, type ModerationOutcome,
} from '../server/conversationSafety.js';

interface TranscriptEntry {
  role: 'user' | 'assistant';
  content: string;
  at: string;
}

const RETRY_REPLY = "Sorry, I'm having trouble connecting right now. Try sending that again.";

// Full server-side orchestration — see server/conversationSafety.ts for
// every decision this makes. The client only ever supplies a sessionId,
// an allowlisted topicId, and its own message; it never builds a prompt
// or sees anything before moderation has run. Node runtime (not edge):
// moderating a reply before it's shown means there's no benefit to
// streaming, and this needs Supabase writes like every other API route.
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

    const user = await verifyUser(req.headers.authorization);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const token = String(req.headers.authorization).replace(/^Bearer\s+/i, '');
    const client = supabaseAsUser(token);

    const { sessionId, topicId, message }: { sessionId?: string; topicId?: string; message?: string } = req.body ?? {};

    // ── Start a new session ────────────────────────────────────────────
    if (!sessionId) {
      if (!topicId || !isValidConversationTopicId(topicId)) {
        return res.status(400).json({ error: 'Invalid or missing topic' });
      }

      const { data: config } = await client.from('parent_config').select('kid_gender').eq('student_id', user.id).maybeSingle();
      const kidGender = (config?.kid_gender as 'girl' | 'boy' | 'other' | undefined) ?? undefined;

      let opener: string;
      try {
        opener = await groqChat(
          [
            { role: 'system', content: buildSystemPrompt(topicId, MAX_TURNS, kidGender) },
            { role: 'user', content: 'hey' },
          ],
          { maxTokens: 150 },
        );
      } catch (err) {
        if (!(err instanceof GroqRequestError)) throw err;
        return res.status(200).json({ reply: RETRY_REPLY, ended: false, turnsRemaining: MAX_TURNS, needsRetryStart: true });
      }

      const openerModeration = await runModeration(opener);
      const openerReply = openerModeration.verdict === 'safe' ? opener : MODERATION_BLOCKED_REPLY;

      const now = new Date().toISOString();
      const { data: created, error } = await client
        .from('conversation_sessions')
        .insert({
          student_id: user.id,
          topic: topicId,
          transcript: [{ role: 'assistant', content: openerReply, at: now }] satisfies TranscriptEntry[],
          turn_count: 0,
        })
        .select('id')
        .single();
      if (error || !created) return res.status(500).json({ error: error?.message ?? 'Could not start conversation' });

      return res.status(200).json({ sessionId: created.id, reply: openerReply, ended: false, turnsRemaining: MAX_TURNS });
    }

    // ── Continue an existing session ───────────────────────────────────
    if (!message?.trim()) return res.status(400).json({ error: 'Missing message' });

    const { data: row, error: loadError } = await client
      .from('conversation_sessions')
      .select('id, topic, started_at, ended_at, ended_reason, turn_count, transcript')
      .eq('id', sessionId)
      .maybeSingle();
    if (loadError || !row) return res.status(404).json({ error: 'Conversation not found' });

    const now = new Date();
    const sessionState: ConversationSessionState = {
      ended: row.ended_at !== null,
      turnCount: row.turn_count,
      startedAt: new Date(row.started_at),
    };
    const transcript = (row.transcript as TranscriptEntry[]) ?? [];

    // Placeholder 'safe' verdict — decideIncomingMessage's priority order
    // (ended -> caps -> keyword escalation -> moderation -> identity)
    // means this alone already resolves everything except the cases that
    // genuinely need a real moderation verdict, so the network call below
    // is skipped whenever it wouldn't change the outcome.
    let decision = decideIncomingMessage(sessionState, message, now, { verdict: 'safe' });
    let moderation: ModerationOutcome = { verdict: 'safe' };
    if (decision.action === 'needs_model_reply') {
      moderation = await runModeration(message);
      decision = decideIncomingMessage(sessionState, message, now, moderation);
    }

    if (decision.action === 'rejected') {
      return res.status(200).json({
        sessionId, reply: '', ended: true, endedReason: row.ended_reason ?? undefined, turnsRemaining: 0,
      });
    }

    if (decision.action === 'cap_reached') {
      // Defensive path (e.g. a stale client retry) — the primary ending
      // path is below, right after a normal model reply pushes the count
      // over the cap. Nothing new to say here; just close it out.
      const endedAt = now.toISOString();
      await client.from('conversation_sessions').update({ ended_at: endedAt, ended_reason: decision.reason }).eq('id', sessionId);
      return res.status(200).json({ sessionId, reply: '', ended: true, endedReason: decision.reason, turnsRemaining: 0 });
    }

    if (decision.action === 'escalate') {
      const nowIso = now.toISOString();
      const newTranscript: TranscriptEntry[] = [
        ...transcript,
        { role: 'user', content: message, at: nowIso },
        { role: 'assistant', content: ESCALATION_REPLY, at: nowIso },
      ];
      await client.from('conversation_sessions').update({
        transcript: newTranscript,
        turn_count: row.turn_count + 1,
        ended_at: nowIso,
        ended_reason: 'escalation',
        escalation: true,
        escalation_at: nowIso,
      }).eq('id', sessionId);
      return res.status(200).json({ sessionId, reply: ESCALATION_REPLY, ended: true, endedReason: 'escalation', turnsRemaining: 0 });
    }

    if (decision.action === 'blocked' || decision.action === 'identity_reply') {
      const reply = decision.action === 'blocked' ? MODERATION_BLOCKED_REPLY : IDENTITY_HONESTY_REPLY;
      const nowIso = now.toISOString();
      const newTurnCount = row.turn_count + 1;
      const newTranscript: TranscriptEntry[] = [
        ...transcript,
        { role: 'user', content: message, at: nowIso },
        { role: 'assistant', content: reply, at: nowIso },
      ];
      const justCapped = hasReachedTurnCap(newTurnCount) || hasReachedTimeCap(sessionState.startedAt, now);
      await client.from('conversation_sessions').update({
        transcript: newTranscript,
        turn_count: newTurnCount,
        ...(justCapped ? { ended_at: nowIso, ended_reason: hasReachedTurnCap(newTurnCount) ? 'turn_cap' : 'time_cap' } : {}),
      }).eq('id', sessionId);
      return res.status(200).json({
        sessionId, reply, ended: justCapped,
        endedReason: justCapped ? (hasReachedTurnCap(newTurnCount) ? 'turn_cap' : 'time_cap') : undefined,
        turnsRemaining: Math.max(0, MAX_TURNS - newTurnCount),
      });
    }

    // ── decision.action === 'needs_model_reply' ─────────────────────────
    const { data: config } = await client.from('parent_config').select('kid_gender').eq('student_id', user.id).maybeSingle();
    const kidGender = (config?.kid_gender as 'girl' | 'boy' | 'other' | undefined) ?? undefined;
    const turnsRemainingBefore = Math.max(0, MAX_TURNS - row.turn_count);

    let modelReply: string;
    try {
      modelReply = await groqChat(
        [
          { role: 'system', content: buildSystemPrompt(row.topic, turnsRemainingBefore, kidGender) },
          ...transcript.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: message },
        ],
        { maxTokens: 200 },
      );
    } catch (err) {
      if (!(err instanceof GroqRequestError)) throw err;
      return res.status(200).json({ sessionId, reply: RETRY_REPLY, ended: false, turnsRemaining: turnsRemainingBefore });
    }

    const replyModeration = await runModeration(modelReply);
    const finalReply = replyModeration.verdict === 'safe' ? modelReply : MODERATION_BLOCKED_REPLY;

    const nowIso = now.toISOString();
    const newTurnCount = row.turn_count + 1;
    const newTranscript: TranscriptEntry[] = [
      ...transcript,
      { role: 'user', content: message, at: nowIso },
      { role: 'assistant', content: finalReply, at: nowIso },
    ];
    const justCapped = hasReachedTurnCap(newTurnCount) || hasReachedTimeCap(sessionState.startedAt, now);
    const endedReason = justCapped ? (hasReachedTurnCap(newTurnCount) ? 'turn_cap' : 'time_cap') : undefined;

    let feedback: string | undefined;
    if (justCapped) {
      try {
        const fb = await groqChat([{ role: 'user', content: buildFeedbackPrompt(newTranscript) }], { maxTokens: 250, temperature: 0.5 });
        const fbModeration = await runModeration(fb);
        feedback = fbModeration.verdict === 'safe' ? fb : undefined;
      } catch {
        feedback = undefined;
      }
    }

    await client.from('conversation_sessions').update({
      transcript: newTranscript,
      turn_count: newTurnCount,
      ...(justCapped ? { ended_at: nowIso, ended_reason: endedReason } : {}),
    }).eq('id', sessionId);

    return res.status(200).json({
      sessionId, reply: finalReply, ended: justCapped, endedReason, feedback,
      turnsRemaining: Math.max(0, MAX_TURNS - newTurnCount),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Conversation request failed' });
  }
}
