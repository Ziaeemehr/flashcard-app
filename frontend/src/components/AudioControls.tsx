import { Volume2, Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakFrench } from "@/lib/speech";

interface AudioControlsProps {
  text: string;
}

export function AudioControls({ text }: AudioControlsProps) {
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <div className="flex items-center gap-1" onClick={stop}>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Play pronunciation"
        onClick={() => speakFrench(text, 1)}
      >
        <Volume2 className="size-5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        title="Play slowly"
        onClick={() => speakFrench(text, 0.6)}
      >
        <Gauge className="size-5" />
      </Button>
    </div>
  );
}
