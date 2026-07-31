import { useEffect, useRef, useState } from 'react';
import { sendConversationTurn } from '../api';
import { loadConfig } from '../storage';
import type { ConversationMessage } from '../types';
import { CONVERSATION_TOPICS, type ConversationTopic } from '../conversationTopics';

// ── Icons ─────────────────────────────────────────────────────────────────────

function IconTv() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>;
}
function IconBasketball() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93c4.08 4.08 6.48 9.65 6.48 15.07"/><path d="M19.07 4.93c-4.08 4.08-6.48 9.65-6.48 15.07"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
}
function IconMusic() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>;
}
function IconGamepad() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><line x1="6" y1="12" x2="10" y2="12"/><line x1="8" y1="10" x2="8" y2="14"/><circle cx="15" cy="11" r="1"/><circle cx="17" cy="13" r="1"/><path d="M6 9h12l1.5 9H4.5L6 9z"/></svg>;
}
function IconPizza() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2 2 22h20L12 2z"/><line x1="12" y1="2" x2="12" y2="22"/><path d="M2 22h20"/></svg>;
}
function IconSchool() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}
function IconPaw() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="9" r="2"/><circle cx="11" cy="6" r="2"/><circle cx="16" cy="6" r="2"/><circle cx="20" cy="10" r="2"/><path d="M8 17c-1.5-3 1-6 5-6s6.5 3 5 6c-1 2-3 3-5 3s-4-1-5-3z"/></svg>;
}

const TOPIC_ICONS: Record<string, React.ReactNode> = {
  shows: <IconTv />, sports: <IconBasketball />, music: <IconMusic />, games: <IconGamepad />,
  school: <IconSchool />, pets: <IconPaw />, food: <IconPizza />,
};

// ── Chat bubble ───────────────────────────────────────────────────────────────

function Bubble({ role, content }: { role: 'user' | 'assistant'; content: string }) {
  return (
    <div className={`flex ${role === 'user' ? 'justify-end' : 'justify-start'}`}>
      {role === 'assistant' && (
        <div className="w-7 h-7 rounded-[4px] bg-accent/10 text-accent text-xs font-bold flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          A
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-[4px] text-sm leading-relaxed
          ${role === 'user'
            ? 'bg-accent text-white'
            : 'bg-surface border border-rule text-ink shadow-[var(--shadow-raised)]'
          }`}
      >
        {content}
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start items-end gap-2">
      <div className="w-7 h-7 rounded-[4px] bg-accent/10 text-accent text-xs font-bold flex items-center justify-center flex-shrink-0">
        A
      </div>
      <div className="bg-surface border border-rule shadow-[var(--shadow-raised)] px-4 py-3 rounded-[4px] flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-[2px] bg-muted animate-bounce"
            style={{ animationDelay: `${i * 0.15}s`, animationDuration: '0.8s' }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Topic picker ──────────────────────────────────────────────────────────────

function TopicPicker({ onPick }: { onPick: (topic: ConversationTopic) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-lg mx-auto">
        <h2 className="text-base font-semibold text-ink mb-1">What do you want to talk about?</h2>
        <p className="text-sm text-muted mb-4">Pick a topic and have a conversation with Alex.</p>

        {/* Permanent, plain-language framing — not a one-time popup, so it */}
        {/* can't be seen once and forgotten. */}
        <div className="bg-surface border border-rule rounded-[4px] p-4 mb-5 space-y-1.5">
          <p className="text-sm text-ink">
            <span className="font-semibold">Alex is not a real person.</span> Alex is a computer program made to
            sound like a kid your age, so you can practice talking. If you ask Alex if they are real, Alex will
            tell you the truth.
          </p>
          <p className="text-sm text-ink">
            Your grown-up can read what you and Alex talk about. Your journal is different — that always stays private.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CONVERSATION_TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => onPick(topic)}
              className="flex items-start gap-3 p-4 rounded-[4px] border border-rule bg-surface
                         shadow-[var(--shadow-raised)] hover:border-accent/40
                         transition-colors text-left"
            >
              <span className="w-9 h-9 rounded-[4px] bg-accent/10 text-accent flex items-center justify-center shrink-0">
                {TOPIC_ICONS[topic.id]}
              </span>
              <div>
                <p className="text-sm font-medium text-ink">{topic.label}</p>
                <p className="text-xs text-muted">{topic.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Feedback card ─────────────────────────────────────────────────────────────

function FeedbackCard({ text, onDone }: { text: string; onDone: () => void }) {
  const lines = text
    .split('\n')
    .map(l => l.replace(/^[-•*]\s*/, '').trim())
    .filter(Boolean);

  return (
    <div className="mx-4 mb-4 bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-muted mb-1">
          Conversation feedback
        </p>
        <p className="text-xs text-muted">How that chat went, from Alex's perspective:</p>
      </div>
      <ul className="space-y-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-ink leading-snug">
            <span className="w-1.5 h-1.5 rounded-[2px] bg-accent mt-1.5 flex-shrink-0" />
            {line}
          </li>
        ))}
      </ul>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Escalation-ended card ─────────────────────────────────────────────────────

function EscalationCard({ onDone }: { onDone: () => void }) {
  return (
    <div className="mx-4 mb-4 bg-alert/5 rounded-[4px] border border-alert/25 p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-alert mb-1">Chat ended</p>
        <p className="text-sm text-ink leading-relaxed">
          I let your grown-up know about this chat, so a real person can help. Talking to a real person about
          something hard is a good idea.
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-[4px] text-sm font-semibold bg-alert text-white hover:bg-alert/90 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Main conversation ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function Conversation({ onBack }: Props) {
  const [kidGender, setKidGender] = useState<'girl' | 'boy' | 'other' | undefined>(undefined);
  const [topic, setTopic] = useState<ConversationTopic | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turnsRemaining, setTurnsRemaining] = useState<number | null>(null);
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [conversationEnded, setConversationEnded] = useState(false);
  const [endedReason, setEndedReason] = useState<'turn_cap' | 'time_cap' | 'escalation' | undefined>(undefined);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    loadConfig().then(c => setKidGender(c.kidGender));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const startConversation = async (t: ConversationTopic) => {
    setTopic(t);
    setIsLoading(true);
    setMessages([]);
    setSessionId(null);

    try {
      const result = await sendConversationTurn({ topicId: t.id });
      setSessionId(result.sessionId ?? null);
      setMessages([{ role: 'assistant', content: result.reply }]);
      setTurnsRemaining(result.turnsRemaining);
    } catch (err) {
      console.error(err);
      setMessages([{ role: 'assistant', content: "Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || conversationEnded || !sessionId) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setIsLoading(true);

    try {
      const result = await sendConversationTurn({ sessionId, message: text });
      if (result.reply) setMessages(prev => [...prev, { role: 'assistant', content: result.reply }]);
      setTurnsRemaining(result.turnsRemaining);
      if (result.ended) {
        setConversationEnded(true);
        setEndedReason(result.endedReason);
        if (result.feedback) setFeedbackText(result.feedback);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong.' }]);
    } finally {
      setIsLoading(false);
      if (!conversationEnded) setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleDone = () => {
    setTopic(null);
    setSessionId(null);
    setMessages([]);
    setInput('');
    setFeedbackText(null);
    setConversationEnded(false);
    setEndedReason(undefined);
    setTurnsRemaining(null);
  };

  return (
    <div className="flex flex-col h-screen bg-paper">

      {/* Header */}
      <div className="bg-surface border-b border-rule px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={topic ? handleDone : onBack}
          className="text-muted hover:text-ink transition-colors p-1 -ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-ink">
            {topic ? `Talking about: ${topic.label}` : 'Conversation Practice'}
          </p>
          {topic && !conversationEnded && (
            <p className="text-xs text-muted">
              with Alex (a computer)
              {kidGender === 'girl' ? ' · she/her' : kidGender === 'boy' ? ' · he/him' : ''}
              {turnsRemaining !== null ? ` · ${turnsRemaining} left` : ''}
            </p>
          )}
          {conversationEnded && endedReason !== 'escalation' && (
            <p className="text-xs text-muted font-medium">Conversation complete</p>
          )}
          {conversationEnded && endedReason === 'escalation' && (
            <p className="text-xs text-alert font-medium">Chat ended early</p>
          )}
        </div>
      </div>

      {/* Body */}
      {!topic ? (
        <TopicPicker onPick={startConversation} />
      ) : (
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          <div className="max-w-lg mx-auto space-y-3">
            {messages.map((msg, i) => (
              <Bubble key={i} role={msg.role} content={msg.content} />
            ))}
            {isLoading && <TypingIndicator />}
            {conversationEnded && endedReason === 'escalation' && <EscalationCard onDone={handleDone} />}
            {conversationEnded && endedReason !== 'escalation' && feedbackText && (
              <FeedbackCard text={feedbackText} onDone={handleDone} />
            )}
            {conversationEnded && endedReason !== 'escalation' && !feedbackText && (
              <div className="mx-0 mb-4 bg-surface rounded-[4px] border border-rule shadow-[var(--shadow-raised)] p-5 space-y-4">
                <p className="text-sm text-ink">Nice job practicing! That's it for this chat.</p>
                <button
                  onClick={handleDone}
                  className="w-full py-3 rounded-[4px] text-sm font-semibold bg-accent text-white hover:bg-accent-hover transition-colors"
                >
                  Done
                </button>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Input */}
      {topic && !conversationEnded && (
        <div className="bg-surface border-t border-rule px-4 py-3 flex-shrink-0">
          <div className="max-w-lg mx-auto flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type a message…"
              disabled={isLoading || !sessionId}
              className="flex-1 rounded-[4px] border border-rule px-4 py-2.5 text-sm text-ink
                         placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/40
                         resize-none disabled:opacity-50"
              style={{ minHeight: '42px', maxHeight: '120px' }}
              onInput={e => {
                const t = e.currentTarget;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 120) + 'px';
              }}
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isLoading || !sessionId}
              className="h-10 w-10 rounded-[4px] bg-accent text-white flex items-center justify-center
                         hover:bg-accent-hover disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-muted mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}
