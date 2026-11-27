// src/features/market/components/LimitedBadge.tsx
//
// Gold "limited edition" mark: a gem icon, plus the edition size when it is small (< 10) to signal scarcity.
// The long wording lives in the tooltip / accessible label instead of on the tag.

import { Gem } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  editionSize?: number | null;
  className?: string;
}

export function LimitedBadge({ editionSize, className }: Props) {
  const showCount = editionSize != null && editionSize > 0 && editionSize < 10;
  const text = editionSize != null && editionSize > 0 ? `Limited edition · only ${editionSize} made` : "Limited edition";
  return (
    <span
      title={text}
      aria-label={text}
      role="img"
      className={cn(
        "inline-flex h-7 min-w-7 items-center justify-center gap-1 rounded-full bg-gold px-2 text-[11px] font-bold tabular-nums text-gold-foreground shadow-gold",
        className,
      )}
    >
      <Gem className="h-3.5 w-3.5" />
      {showCount && <span>{editionSize}</span>}
    </span>
  );
}
