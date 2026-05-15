import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/**
 * Small, muted badge shown next to the winning value in a Team Comparison row
 * when the backend signals that the row's edge is reinforced by other matchup
 * signals.
 *
 * Wording is locked. The badge never exposes backend field names or jargon.
 * Renders nothing unless `allowed === true` AND a `teamAbbr` is provided.
 * Callers must also suppress the badge on tied/even rows (no edge to back).
 *
 * Keyboard-accessible: the trigger is a real <button> so the tooltip can be
 * surfaced via focus as well as hover.
 */
export function MatchupSupportBadge({
  allowed,
  teamAbbr,
  className,
}: {
  allowed?: boolean | null;
  teamAbbr?: string | null;
  className?: string;
}) {
  if (allowed !== true) return null;
  const abbr = (teamAbbr ?? "").trim();
  if (!abbr) return null;

  const label = "Fits matchup";
  const tip = "This stat edge lines up with the broader pregame matchup. It does not guarantee the result.";
  void abbr;

  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-5 select-none items-center rounded-full border border-border/60 bg-muted/30 px-2 text-[10px] font-medium leading-none text-muted-foreground transition-colors hover:border-border hover:text-foreground/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background",
            className,
          )}
        >
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-[11.5px] leading-snug">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}
