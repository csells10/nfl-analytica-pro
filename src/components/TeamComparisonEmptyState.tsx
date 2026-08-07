import { Info } from "lucide-react";

/**
 * Calm, intentional empty state for the Team Comparison card.
 * Shown only when the loaded /game payload has no `team_comparison` rows —
 * this is an evidence threshold, not an error or loading state.
 */
export function TeamComparisonEmptyState() {
  return (
    <div className="flex min-h-[190px] flex-col justify-center rounded-lg border border-border bg-muted/40 px-5 py-7 sm:px-7">
      <div className="mx-auto w-full max-w-md space-y-3 text-center">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          <Info className="h-3 w-3" />
          Season context
        </span>
        <h3 className="text-[15px] font-semibold leading-snug tracking-tight text-foreground">
          Season evidence is still being established.
        </h3>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          GameLens builds Team Comparison from performance in the current season phase rather than
          carrying over historical seasons.
        </p>
        <p className="text-[12px] leading-relaxed text-muted-foreground">
          This comparison will appear once both teams have completed a game in this phase.
        </p>
      </div>
    </div>
  );
}
