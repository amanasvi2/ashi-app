import Groq from 'groq-sdk';

// DEV ONLY — API key is exposed in the browser bundle.
// Before any deployment, proxy all AI requests through a backend endpoint.
export const groq = new Groq({
  apiKey: import.meta.env.VITE_GROQ_API_KEY ?? '',
  dangerouslyAllowBrowser: true,
});

export const CONVERSATION_MODEL = 'llama-3.3-70b-versatile';
