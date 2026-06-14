interface ClickableTextProps {
  text: string;
  onWordClick: (word: string) => void;
}

const WORD_RE = /([a-zA-ZÀ-ÿœŒæÆ'-]+)/g;

export function ClickableText({ text, onWordClick }: ClickableTextProps) {
  const parts = text.split(WORD_RE);

  return (
    <>
      {parts.map((part, i) => {
        if (!WORD_RE.test(part)) {
          WORD_RE.lastIndex = 0;
          return <span key={i}>{part}</span>;
        }
        WORD_RE.lastIndex = 0;
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onWordClick(part.toLowerCase());
            }}
            className="cursor-pointer rounded hover:bg-accent hover:text-accent-foreground"
          >
            {part}
          </span>
        );
      })}
    </>
  );
}
