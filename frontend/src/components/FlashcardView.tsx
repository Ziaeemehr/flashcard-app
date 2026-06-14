import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AudioControls } from "@/components/AudioControls";
import { ClickableText } from "@/components/ClickableText";
import type { Flashcard } from "@/types";

interface FlashcardViewProps {
  card: Flashcard;
  flipped: boolean;
  onFlip: () => void;
  onWordClick: (word: string) => void;
  onDelete?: () => void;
}

const TYPE_COLORS: Record<string, string> = {
  noun: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  verb: "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  adjective: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  adverb: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  pronoun: "bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-300",
  preposition: "bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-300",
  conjunction: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300",
  interjection: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  article: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const DEFAULT_TYPE_COLOR = "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300";

function typeColor(type: string): string {
  return TYPE_COLORS[type.toLowerCase()] ?? DEFAULT_TYPE_COLOR;
}

export function FlashcardView({ card, flipped, onFlip, onWordClick, onDelete }: FlashcardViewProps) {
  return (
    <div className="relative [perspective:1200px] w-full max-w-xl h-80">
      {onDelete && (
        <Button
          variant="destructive"
          size="icon-sm"
          className="absolute right-2 top-2 z-10"
          title="Delete card"
          onClick={(e) => {
            e.stopPropagation();
            if (confirm(`Delete the flashcard for "${card.word}"?`)) onDelete();
          }}
        >
          ✕
        </Button>
      )}
      <div
        onClick={onFlip}
        className={cn(
          "relative h-full w-full cursor-pointer rounded-xl border bg-card shadow-sm transition-transform duration-500 [transform-style:preserve-3d]",
          flipped && "[transform:rotateY(180deg)]",
        )}
      >
        {/* Front */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 [backface-visibility:hidden]"
          style={{ pointerEvents: flipped ? "none" : "auto" }}
        >{/* hidden when flipped */}
          <span className="text-4xl font-semibold text-foreground">{card.word}</span>
          {card.phonetic && (
            <span className="text-muted-foreground">{card.phonetic}</span>
          )}
          <AudioControls text={card.word} />
          <span className="absolute bottom-4 text-xs text-muted-foreground">
            Click to flip
          </span>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 flex flex-col items-start justify-center gap-3 overflow-y-auto p-6 text-left [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={{ pointerEvents: flipped ? "auto" : "none" }}
        >
          <div className="flex w-full flex-wrap items-center justify-center gap-2">
            <span className="text-2xl font-semibold text-blue-700 dark:text-blue-400">
              {card.word}
            </span>
            {card.type && (
              <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium italic", typeColor(card.type))}>
                {card.type}
              </span>
            )}
          </div>
          {card.phonetic && (
            <p className="w-full text-center text-amber-600 dark:text-amber-400">{card.phonetic}</p>
          )}
          {card.definition && (
            <div className="w-full">
              <h3 className="text-sm font-medium text-indigo-600 dark:text-indigo-400">Definition</h3>
              <p className="text-foreground">
                <ClickableText text={card.definition} onWordClick={onWordClick} />
              </p>
            </div>
          )}
          {card.examples.length > 0 && (
            <div className="w-full">
              <h3 className="text-sm font-medium text-emerald-600 dark:text-emerald-400">Examples</h3>
              <ul className="flex flex-col gap-1">
                {card.examples.map((ex, i) => (
                  <li key={i} className="flex items-center gap-1">
                    <span className="list-item list-inside list-disc italic text-emerald-800 dark:text-emerald-300">
                      <ClickableText text={ex} onWordClick={onWordClick} />
                    </span>
                    <AudioControls text={ex} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
