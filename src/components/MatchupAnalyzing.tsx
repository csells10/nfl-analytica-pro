import { forwardRef } from "react";
import { ChevronDown, FileText, Radar, Scale } from "lucide-react";
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
    { label: "Game Profile", color: "text-motion-analysis", Icon: FileText },
    { label: "Core Areas", color: "text-motion-signal", Icon: Radar },
    { label: "Team Comparison", color: "text-motion-lens", Icon: Scale },
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
            <div className="relative mx-auto h-12 w-6" aria-hidden="true">
              <span className="absolute left-1/2 top-1 h-7 w-px -translate-x-1/2 bg-motion-rail" />
              <span className="absolute left-1/2 top-1 h-1.5 w-1.5 -translate-x-1/2 animate-handoff-drop rounded-full bg-motion-analysis motion-reduce:hidden" />
              <span className="absolute bottom-2 left-1/2 h-2 w-2 -translate-x-1/2 animate-handoff-ripple rounded-full border border-motion-analysis/70 motion-reduce:hidden" />
              <ChevronDown
                data-testid="analysis-handoff-chevron"
                className="absolute bottom-0 left-1/2 h-[18px] w-[18px] -translate-x-1/2 animate-handoff-chevron text-motion-rail motion-reduce:animate-none"
                strokeWidth={2}
              />
            </div>
          </>
        )}

        <div className={away && home ? "border-t border-border pt-5" : "text-center"}>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Preparing game analysis</h1>
          {away && home && (
            <div className="mt-5" aria-label="Analysis scope">
              <div className="relative mb-3 grid h-3 grid-cols-3" aria-hidden="true" data-testid="analysis-progress-rail">
                <span className="absolute left-[16.6667%] right-[16.6667%] top-1/2 h-px -translate-y-1/2 bg-motion-rail" />
                <span className="relative flex items-center justify-center"><span className="h-2 w-2 rounded-full border border-motion-analysis bg-card" /></span>
                <span className="relative flex items-center justify-center"><span className="h-2 w-2 rounded-full border border-motion-signal bg-card" /></span>
                <span className="relative flex items-center justify-center"><span className="h-2 w-2 rounded-full border border-motion-lens bg-card" /></span>
                <span className="absolute left-[16.6667%] top-1/2 h-2 w-[66.6666%] -translate-y-1/2 animate-analysis-signal motion-reduce:hidden">
                  <span className="block h-2 w-2 -translate-x-1/2 rounded-full bg-motion-analysis" />
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {stages.map((stage, index) => (
                  <div
                    key={stage.label}
                    className={`flex h-14 min-w-0 items-center gap-2 rounded-md border bg-muted/10 px-2.5 py-2 max-[419px]:h-20 max-[419px]:flex-col max-[419px]:justify-center max-[419px]:gap-1.5 max-[419px]:px-1 ${index === 0 ? "border-border/70 motion-reduce:border-motion-analysis" : "border-border/70"}`}
                  >
                    <span className="flex h-5 shrink-0 items-center gap-1.5" aria-hidden="true">
                      <stage.Icon className={`h-4 w-4 shrink-0 ${stage.color}`} strokeWidth={1.75} />
                      <span className={`w-4 font-mono text-[10px] ${stage.color}`}>0{index + 1}</span>
                    </span>
                    <span className="min-w-0 text-center text-[11px] font-medium leading-tight text-foreground/80 sm:text-left sm:text-xs">{stage.label}</span>
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
