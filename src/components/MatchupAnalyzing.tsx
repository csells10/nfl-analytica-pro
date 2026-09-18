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

  return (
    <div
      ref={ref}
      className="flex min-h-[58vh] animate-matchup-reveal items-center justify-center motion-reduce:animate-none"
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
                <img src={teamLogoUrl(away.abbr)} alt={`${away.fullName} logo`} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />
                <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">{away.fullName}</p>
              </div>
              <span className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">at</span>
              <div className="flex min-w-0 flex-col items-center gap-2 text-center sm:flex-row-reverse sm:text-right">
                <img src={teamLogoUrl(home.abbr)} alt={`${home.fullName} logo`} className="h-14 w-14 shrink-0 object-contain sm:h-16 sm:w-16" />
                <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">{home.fullName}</p>
              </div>
            </div>
            {context && <p className="mt-4 text-center font-mono text-[11px] text-muted-foreground">{context}</p>}
          </>
        )}

        <div className={away && home ? "mt-7 border-t border-border pt-6" : "text-center"}>
          <h1 className="text-lg font-bold text-foreground sm:text-xl">Preparing game analysis</h1>
          {away && home && (
            <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Analysis scope">
              {["Game Profile", "Core Areas", "Team Comparison"].map((label, index) => (
                <div key={label} className="flex items-center gap-3 rounded-md border border-border/70 bg-muted/10 px-3 py-2.5">
                  <span className="font-mono text-[10px] text-primary">0{index + 1}</span>
                  <span className="text-xs font-medium text-foreground/80">{label}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
