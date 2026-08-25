import { ArrowLeft, Loader2, Repeat } from "lucide-react";

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
  /** True while a background refresh is in flight; current data stays visible. */
  isRefreshing?: boolean;
  onBack: () => void;
  onChangeMatchup: () => void;
}

/**
 * Compact sticky context. It sits under the app navigation, never overlays the
 * canvas, and always answers: which matchup, which window, what am I viewing.
 * On small screens it compresses to abbreviations plus icon-only controls.
 */
export function MatchupContextBar({
  labelA,
  labelB,
  nameA,
  nameB,
  contextLine,
  viewingLabel,
  isOverview,
  isRefreshing = false,
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
        <p className="hidden min-w-0 truncate font-mono text-[11px] text-muted-foreground sm:block">
          {contextLine}
        </p>
        <p
          className="rounded border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] font-medium text-foreground"
          data-testid="context-viewing"
        >
          Viewing: {viewingLabel}
        </p>
        {isRefreshing && (
          <p
            role="status"
            aria-live="polite"
            data-testid="context-refreshing"
            className="inline-flex items-center gap-1 text-[11px] text-muted-foreground"
          >
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
            Updating matchup…
          </p>
        )}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {!isOverview && (
            <button
              type="button"
              data-testid="context-back"
              onClick={onBack}
              aria-label="Back to Overview"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[32px] sm:min-w-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="hidden sm:inline">Overview</span>
            </button>
          )}
          <button
            type="button"
            data-testid="context-change-matchup"
            onClick={onChangeMatchup}
            aria-label="Change matchup"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[32px] sm:min-w-0"
          >
            <Repeat className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Change matchup</span>
          </button>
        </div>
      </div>
    </div>
  );
}
