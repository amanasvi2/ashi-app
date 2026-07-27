import { useEffect, useRef, useState } from 'react';
import { groq, CONVERSATION_MODEL } from '../api';
import { loadConfig } from '../storage';
import type { ConversationMessage } from '../types';

// ── Topics ────────────────────────────────────────────────────────────────────

interface Topic {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
}

function IconTv() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/></svg>;
}
function IconBasketball() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M4.93 4.93c4.08 4.08 6.48 9.65 6.48 15.07"/><path d="M19.07 4.93c-4.08 4.08-6.48 9.65-6.48 15.07"/><line x1="2" y1="12" x2="22" y2="12"/></svg>;
}
function IconCalendar() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
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
function IconStar() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>;
}
function IconSchool() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

const TOPICS: Topic[] = [
  {
    id: 'shows',
    label: 'Shows & Movies',
    description: 'What are you watching?',
    icon: <IconTv />,
    prompt: 'a show or movie you both might have seen or want to watch',
  },
  {
    id: 'sports',
    label: 'Sports',
    description: 'Teams, players, games',
    icon: <IconBasketball />,
    prompt: 'sports — teams, playing, watching games, PE class',
  },
  {
    id: 'weekend',
    label: 'Weekend Plans',
    description: "What are you up to?",
    icon: <IconCalendar />,
    prompt: 'weekend plans and what you do for fun',
  },
  {
    id: 'music',
    label: 'Music',
    description: 'Songs, artists, playlists',
    icon: <IconMusic />,
    prompt: 'music — favorite songs, artists, concerts, playlists',
  },
  {
    id: 'games',
    label: 'Games',
    description: 'Video games, board games',
    icon: <IconGamepad />,
    prompt: 'video games or board games you play',
  },
  {
    id: 'food',
    label: 'Food',
    description: 'Favorites, restaurants',
    icon: <IconPizza />,
    prompt: 'food — favorite foods, restaurants, cooking, school lunch',
  },
  {
    id: 'funny',
    label: 'Something Funny',
    description: 'A weird or funny story',
    icon: <IconStar />,
    prompt: 'something funny, random, or weird that happened recently',
  },
  {
    id: 'school',
    label: 'School',
    description: 'Classes, teachers, stuff',
    icon: <IconSchool />,
    prompt: 'school — interesting classes, teachers, projects, lunch',
  },
];

// ── System prompt ─────────────────────────────────────────────────────────────

const FEEDBACK_MARKER = '\n---FEEDBACK---\n';

function buildSystemPrompt(topicPrompt: string, kidGender?: 'girl' | 'boy' | 'other'): string {
  const alexDesc = kidGender === 'girl'
    ? 'friendly 13-year-old girl'
    : kidGender === 'boy'
    ? 'friendly 13-year-old boy'
    : 'friendly 13-year-old student';
  return `You are Alex, a ${alexDesc} texting casually with a classmate. This is a real conversation — not a lesson, not a test.

How to write:
- Short messages only: 1–3 sentences max per turn
- Casual and genuine, like you're texting a friend
- React to what they said first, then share your own thought or ask one question
- Be warm but not fake or over-the-top — just normal
- No emojis in every message, keep it natural

The conversation topic to start with: ${topicPrompt}

Start with a friendly opener about this topic. Keep the conversation going naturally for about 7 exchanges from them.

When to end: After the user has sent about 7 messages, wrap up the conversation naturally — like class is starting or you have to go somewhere. Then on a NEW LINE write exactly:
${FEEDBACK_MARKER.trim()}
And below that, write 3 short bullet points of honest, kind feedback about how the conversation went. Note one thing they did well (like sharing details, asking questions, responding to what you said), one gentle suggestion for next time, and one encouraging closer. Keep it brief and specific — refer to what actually happened in the chat.`;
}

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

function TopicPicker({ onPick }: { onPick: (topic: Topic) => void }) {
  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-lg mx-auto">
        <h2 className="text-base font-semibold text-slate-800 mb-1">What do you want to talk about?</h2>
        <p className="text-sm text-slate-400 mb-5">Pick a topic and have a real conversation with Alex.</p>
        <div className="grid grid-cols-2 gap-2.5">
          {TOPICS.map(topic => (
            <button
              key={topic.id}
              onClick={() => onPick(topic)}
              className="flex items-start gap-3 p-4 rounded-xl border border-slate-200 bg-white
                         hover:border-blue-300 hover:shadow-sm hover:shadow-blue-50
                         transition-all text-left group"
            >
              <span className="text-blue-400 group-hover:text-blue-600 transition-colors mt-0.5 flex-shrink-0">
                {topic.icon}
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

// ── Main conversation ─────────────────────────────────────────────────────────

interface Props {
  onBack: () => void;
}

export function Conversation({ onBack }: Props) {
  const kidGender = loadConfig().kidGender;
  const [topic, setTopic] = useState<Topic | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [history, setHistory] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [streamText, setStreamText] = useState('');
  const [feedbackText, setFeedbackText] = useState<string | null>(null);
  const [conversationEnded, setConversationEnded] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamText, isLoading]);

  const startConversation = async (t: Topic) => {
    setTopic(t);
    setIsLoading(true);
    setStreamText('');

    const systemPrompt = buildSystemPrompt(t.prompt, kidGender);
    try {
      const stream = await groq.chat.completions.create({
        model: CONVERSATION_MODEL,
        max_tokens: 300,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'hey' },
        ],
      });

      let text = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) { text += delta; setStreamText(text); }
      }

      const assistantMsg = { role: 'assistant' as const, content: text };
      setStreamText('');
      setMessages([assistantMsg]);
      setHistory([{ role: 'user', content: 'hey' }, assistantMsg]);
    } catch (err) {
      console.error(err);
      setMessages([{ role: 'assistant', content: "Hey! Sorry, I'm having trouble connecting right now." }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || conversationEnded) return;

    setInput('');
    const userMsg: ConversationMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    const newHistory = [...history, { role: 'user' as const, content: text }];
    setHistory(newHistory);
    setIsLoading(true);
    setStreamText('');

    try {
      const stream = await groq.chat.completions.create({
        model: CONVERSATION_MODEL,
        max_tokens: 400,
        stream: true,
        messages: [
          { role: 'system', content: buildSystemPrompt(topic!.prompt, kidGender) },
          ...newHistory,
        ],
      });

      let response = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content ?? '';
        if (delta) {
          response += delta;
          setStreamText(response.split(FEEDBACK_MARKER.trim())[0]);
        }
      }

      setStreamText('');

      if (response.includes(FEEDBACK_MARKER.trim())) {
        const [chatPart, fbPart] = response.split(FEEDBACK_MARKER.trim());
        const assistantMsg: ConversationMessage = { role: 'assistant', content: chatPart.trim() };
        setMessages(prev => [...prev, assistantMsg]);
        setHistory(prev => [...prev, { role: 'assistant', content: chatPart.trim() }]);
        setFeedbackText(fbPart.trim());
        setConversationEnded(true);
      } else {
        const assistantMsg: ConversationMessage = { role: 'assistant', content: response };
        setMessages(prev => [...prev, assistantMsg]);
        setHistory(prev => [...prev, { role: 'assistant', content: response }]);
      }
    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, { role: 'assistant', content: "Sorry, something went wrong." }]);
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
    setMessages([]);
    setHistory([]);
    setInput('');
    setFeedbackText(null);
    setConversationEnded(false);
    setStreamText('');
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
              with Alex · 13
              {kidGender === 'girl' ? ' · she/her' : kidGender === 'boy' ? ' · he/him' : ''}
            </p>
          )}
          {conversationEnded && (
            <p className="text-xs text-emerald-600 font-medium">Conversation complete</p>
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
            {isLoading && !streamText && <TypingIndicator />}
            {streamText && <Bubble role="assistant" content={streamText} />}
            {conversationEnded && feedbackText && (
              <FeedbackCard text={feedbackText} onDone={handleDone} />
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
              disabled={isLoading}
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
              disabled={!input.trim() || isLoading}
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
