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
        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center mr-2 mt-1 flex-shrink-0">
          A
        </div>
      )}
      <div
        className={`max-w-[78%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed
          ${role === 'user'
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-white border border-slate-100 text-slate-800 rounded-bl-sm shadow-sm'
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
      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-600 text-xs font-bold flex items-center justify-center flex-shrink-0">
        A
      </div>
      <div className="bg-white border border-slate-100 shadow-sm px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1 items-center">
        {[0, 1, 2].map(i => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-bounce"
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
        <h2 className="text-base font-semibold text-slate-800 mb-1">What do you want to talk about?</h2>
        <p className="text-sm text-slate-400 mb-4">Pick a topic and have a conversation with Alex.</p>

        {/* Permanent, plain-language framing — not a one-time popup, so it */}
        {/* can't be seen once and forgotten. */}
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-5 space-y-1.5">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">Alex is not a real person.</span> Alex is a computer program made to
            sound like a kid your age, so you can practice talking. If you ask Alex if they are real, Alex will
            tell you the truth.
          </p>
          <p className="text-sm text-slate-700">
            Your grown-up can read what you and Alex talk about. Your journal is different — that always stays private.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          {CONVERSATION_TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => onPick(topic)}
              className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white
                         hover:border-blue-300 hover:shadow-sm hover:shadow-blue-50
                         transition-all text-left group"
            >
              <span className="text-blue-400 group-hover:text-blue-600 transition-colors mt-0.5 flex-shrink-0">
                {TOPIC_ICONS[topic.id]}
              </span>
              <div>
                <p className="text-sm font-medium text-slate-800">{topic.label}</p>
                <p className="text-xs text-slate-400">{topic.description}</p>
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
    <div className="mx-4 mb-4 bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-blue-500 mb-1">
          Conversation feedback
        </p>
        <p className="text-xs text-slate-400">How that chat went, from Alex's perspective:</p>
      </div>
      <ul className="space-y-2.5">
        {lines.map((line, i) => (
          <li key={i} className="flex gap-2.5 text-sm text-slate-700 leading-snug">
            <span className="text-blue-400 mt-0.5 flex-shrink-0">
              {i === 0 ? '✓' : i === 1 ? '→' : '★'}
            </span>
            {line}
          </li>
        ))}
      </ul>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Done
      </button>
    </div>
  );
}

// ── Escalation-ended card ─────────────────────────────────────────────────────

function EscalationCard({ onDone }: { onDone: () => void }) {
  return (
    <div className="mx-4 mb-4 bg-amber-50 rounded-2xl border border-amber-200 shadow-sm p-5 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-1">Chat ended</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          I let your grown-up know about this chat, so a real person can help. Talking to a real person about
          something hard is a good idea.
        </p>
      </div>
      <button
        onClick={onDone}
        className="w-full py-3 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
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
    <div className="flex flex-col h-screen bg-slate-50">

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 flex items-center gap-3 flex-shrink-0">
        <button
          onClick={topic ? handleDone : onBack}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1 -ml-1"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <p className="text-sm font-semibold text-slate-800">
            {topic ? `Talking about: ${topic.label}` : 'Conversation Practice'}
          </p>
          {topic && !conversationEnded && (
            <p className="text-xs text-slate-400">
              with Alex (a computer)
              {kidGender === 'girl' ? ' · she/her' : kidGender === 'boy' ? ' · he/him' : ''}
              {turnsRemaining !== null ? ` · ${turnsRemaining} left` : ''}
            </p>
          )}
          {conversationEnded && endedReason !== 'escalation' && (
            <p className="text-xs text-emerald-600 font-medium">Conversation complete</p>
          )}
          {conversationEnded && endedReason === 'escalation' && (
            <p className="text-xs text-amber-600 font-medium">Chat ended early</p>
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
              <div className="mx-0 mb-4 bg-white rounded-2xl border border-blue-100 shadow-sm p-5 space-y-4">
                <p className="text-sm text-slate-700">Nice job practicing! That's it for this chat.</p>
                <button
                  onClick={handleDone}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-blue-600 text-white hover:bg-blue-700 transition-colors"
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
        <div className="bg-white border-t border-slate-100 px-4 py-3 flex-shrink-0">
          <div className="max-w-lg mx-auto flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Type a message…"
              disabled={isLoading || !sessionId}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800
                         placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-300
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
              className="h-10 w-10 rounded-xl bg-blue-600 text-white flex items-center justify-center
                         hover:bg-blue-700 disabled:opacity-35 disabled:cursor-not-allowed transition-colors flex-shrink-0"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
          <p className="text-center text-xs text-slate-300 mt-2">Enter to send · Shift+Enter for new line</p>
        </div>
      )}
    </div>
  );
}
