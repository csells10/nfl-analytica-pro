import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Small, muted badge shown next to a Team Comparison metric label when the
 * backend signals that the row's edge is reinforced by other matchup signals.
 *
 * Wording is locked. The badge never exposes backend field names or jargon.
 * Renders nothing unless `allowed === true` — `false`, `null`, and missing
 * all collapse to no UI, by design.
 *
 * Keyboard-accessible: the trigger is a real <button> so the tooltip can be
 * surfaced via focus as well as hover, matching the app's existing Tooltip
 * pattern (Radix TooltipProvider lives at the App root).
 */
export function MatchupSupportBadge({
  allowed,
  className,
}: {
  allowed?: boolean | null;
  className?: string;
}) {
  if (allowed !== true) return null;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Backed by the matchup"
          className={cn(
            "inline-flex h-5 select-none items-center rounded-full border border-border/60 bg-muted/30 px-2 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:border-border hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            className,
          )}
        >
          Backed by the matchup
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[11.5px] leading-snug">
        Other matchup signs point in the same direction, so this read has extra support. It still does not guarantee the result.
      </TooltipContent>
    </Tooltip>
  );
}
