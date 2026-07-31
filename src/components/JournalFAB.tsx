import { useEffect, useState } from 'react';
import { journalWrittenToday } from '../storage';

interface Props {
  onOpen: () => void;
}

export function JournalFAB({ onOpen }: Props) {
  const [done, setDone] = useState(false);

  useEffect(() => {
    journalWrittenToday().then(setDone);
  }, []);

  return (
    <button
      onClick={onOpen}
      aria-label={done ? 'You wrote in your journal today. Tap to see it.' : 'Open your journal'}
      className="fixed z-40 right-4 bottom-[76px] lg:bottom-6 w-14 h-14 rounded-[4px] shadow-[var(--shadow-raised)]
                 flex items-center justify-center text-white bg-accent
                 transition-transform hover:scale-105 active:scale-95"
    >
      {done ? (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
        </svg>
      )}
    </button>
  );
}
