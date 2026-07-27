import { useCallback, useRef, useState } from 'react';

export interface SpeechState {
  speakingText: string | null;
  activeCharIndex: number | null;
}

export function useSpeech() {
  const [state, setState] = useState<SpeechState>({
    speakingText: null,
    activeCharIndex: null,
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const speak = useCallback((text: string) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.88;
    u.pitch = 1;

    setState({ speakingText: text, activeCharIndex: null });

    u.addEventListener('boundary', (e: SpeechSynthesisEvent) => {
      if (e.name === 'word') {
        setState({ speakingText: text, activeCharIndex: e.charIndex });
      }
    });

    u.addEventListener('end', () => {
      setState({ speakingText: null, activeCharIndex: null });
    });

    u.addEventListener('error', () => {
      setState({ speakingText: null, activeCharIndex: null });
    });

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  }, []);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    setState({ speakingText: null, activeCharIndex: null });
  }, []);

  return { speak, stop, ...state };
}
