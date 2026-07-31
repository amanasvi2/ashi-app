import { useMemo } from 'react';

interface Token {
  text: string;
  start: number;
  isWord: boolean;
}

function parseTokens(text: string): Token[] {
  const tokens: Token[] = [];
  const re = /\S+|\s+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    tokens.push({ text: m[0], start: m.index, isWord: /\S/.test(m[0]) });
  }
  return tokens;
}

interface Props {
  text: string;
  speakingText: string | null;
  activeCharIndex: number | null;
  className?: string;
}

export function HighlightedText({ text, speakingText, activeCharIndex, className }: Props) {
  const tokens = useMemo(() => parseTokens(text), [text]);
  const isThisText = speakingText === text;

  if (!isThisText || activeCharIndex === null) {
    return <p className={className}>{text}</p>;
  }

  return (
    <p className={className}>
      {tokens.map((token, i) => {
        if (!token.isWord) return <span key={i}>{token.text}</span>;

        const isActive =
          token.start <= activeCharIndex &&
          activeCharIndex < token.start + token.text.length;

        return (
          <span
            key={i}
            style={isActive ? { display: 'inline-block', transform: 'scale(1.08)', transformOrigin: 'bottom center' } : { display: 'inline-block' }}
            className={
              isActive
                ? 'text-accent font-bold transition-all duration-75'
                : 'transition-all duration-75'
            }
          >
            {token.text}
          </span>
        );
      })}
    </p>
  );
}
