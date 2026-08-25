import { ArrowLeft, Repeat } from "lucide-react";

interface MatchupContextBarProps {
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  /** Shortened window / as-of context. */
  contextLine: string;
  /** "Overview", "Turnover Balance", "Constellation", … */
  viewingLabel: string;
  isOverview: boolean;
  onBack: () => void;
  onChangeMatchup: () => void;
}

/**
 * Compact sticky context. It sits under the app navigation, never overlays the
 * canvas, and always answers: which matchup, which window, what am I viewing.
 */
export function MatchupContextBar({
  labelA,
  labelB,
  nameA,
  nameB,
  contextLine,
  viewingLabel,
  isOverview,
  onBack,
  onChangeMatchup,
}: MatchupContextBarProps) {
  return (
    <div
      data-testid="matchup-context-bar"
      className="sticky top-[6.1rem] z-20 -mx-4 border-b border-border bg-card/95 px-4 py-2 backdrop-blur-sm md:top-14"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <p className="min-w-0 text-xs font-semibold text-foreground">
          <span className="text-accent-cool">{labelA}</span>
          <span className="text-muted-foreground"> vs </span>
          <span className="text-primary">{labelB}</span>
          <span className="ml-1.5 hidden font-normal text-muted-foreground lg:inline">
            {nameA} vs {nameB}
          </span>
        </p>
        <p className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{contextLine}</p>
        <p
          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
          data-testid="context-viewing"
        >
          Viewing: {viewingLabel}
        </p>
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            data-testid="context-back"
            onClick={onBack}
            disabled={isOverview}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:min-h-[32px]"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to Overview
          </button>
          <button
            type="button"
            data-testid="context-change-matchup"
            onClick={onChangeMatchup}
            className="inline-flex min-h-[44px] items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[32px]"
          >
            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
            Change matchup
          </button>
        </div>
      </div>
    </div>
  );
}
