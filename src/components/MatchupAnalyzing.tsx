import { forwardRef } from "react";
import { getKnownTeam, teamLogoUrl } from "@/lib/nfl-teams";


/**
 * MatchupAnalyzing
 * Structured "live analysis" loading state for the Game Details page.
 * Confident, calm, analytical — uses semantic tokens only.
 *
 * All sub-components are wrapped in forwardRef so they can be safely composed
 * with Radix `asChild` triggers (Tooltip, Popover, etc.) without React
 * emitting "Function components cannot be given refs" warnings.
 */

export interface MatchupLoadingContext {
  awayTeam?: string;
  homeTeam?: string;
  date?: string;
  week?: number;
}

export const MatchupAnalyzing = forwardRef<HTMLDivElement, MatchupLoadingContext>(function MatchupAnalyzing(
  { awayTeam, homeTeam, date, week },
  ref,
) {
  const away = getKnownTeam(awayTeam);
  const home = getKnownTeam(homeTeam);
  const context = [date, typeof week === "number" ? `Week ${week}` : null].filter(Boolean).join(" · ");
  const stages = [
    { label: "Game Profile", color: "text-motion-analysis", accent: "bg-motion-analysis", animation: "animate-stage-profile" },
    { label: "Core Areas", color: "text-motion-signal", accent: "bg-motion-signal", animation: "animate-stage-core" },
    { label: "Team Comparison", color: "text-motion-lens", accent: "bg-motion-lens", animation: "animate-stage-team" },
  ] as const;

  return (
    <div
      ref={ref}
      className="flex min-h-[58vh] animate-briefing-enter items-center justify-center motion-reduce:animate-none"
      data-testid="game-details-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-2xl rounded-lg border border-border bg-card p-5 sm:p-7">
        {away && home && (
          <>
            <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-7">
              <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row sm:text-left">
                <img src={teamLogoUrl(away.abbr)} alt={`${away.fullName} logo`} className="h-14 w-14 shrink-0 animate-logo-settle-away object-contain motion-reduce:animate-none sm:h-16 sm:w-16" />
                <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">{away.fullName}</p>
              </div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">at</span>
              <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
                <img src={teamLogoUrl(home.abbr)} alt={`${home.fullName} logo`} className="h-14 w-14 shrink-0 animate-logo-settle-home object-contain motion-reduce:animate-none sm:h-16 sm:w-16" />
                <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">{home.fullName}</p>
              </div>
            </div>
            {context && <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">{context}</p>}
            <div className="relative mx-auto h-10 w-5" aria-hidden="true">
              <span className="absolute left-1/2 top-1 h-7 w-px -translate-x-1/2 bg-motion-rail/45" />
              <span className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 animate-handoff-drop rounded-full bg-motion-analysis motion-reduce:animate-none motion-reduce:translate-y-7" />
              <span className="absolute bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 animate-handoff-ripple rounded-full border border-motion-analysis/70 motion-reduce:hidden" />
              <span
                data-testid="analysis-handoff-chevron"
                className="absolute bottom-0 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-motion-analysis/70"
              />
            </div>
          </>
        )}

        <div className={away && home ? "border-t border-border pt-5" : "text-center"}>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Preparing game analysis</h1>
          {away && home && (
            <div className="mt-5" aria-label="Analysis scope">
              <div className="relative mx-4 mb-3 h-2" aria-hidden="true">
                <span className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-motion-rail/45" />
                <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-motion-analysis bg-card" />
                <span className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-motion-signal bg-card" />
                <span className="absolute right-0 top-1/2 h-2 w-2 translate-x-1/2 -translate-y-1/2 rounded-full border border-motion-lens bg-card" />
                <span className="absolute left-0 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 animate-analysis-signal rounded-full bg-motion-analysis motion-reduce:animate-none" />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {stages.map((stage, index) => (
                  <div key={stage.label} className="relative flex items-center gap-3 overflow-hidden rounded-md border border-border/70 bg-muted/10 px-3 py-2.5">
                    <span className={`font-mono text-[10px] ${stage.color}`}>0{index + 1}</span>
                    <span className="text-xs font-medium text-foreground/80">{stage.label}</span>
                    <span
                      aria-hidden="true"
                      className={`absolute inset-x-0 bottom-0 h-px opacity-0 ${stage.accent} ${stage.animation} motion-reduce:animate-none ${index === 0 ? "motion-reduce:opacity-100" : "motion-reduce:opacity-0"}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
