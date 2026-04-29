import { Card, CardContent } from "@/components/ui/card";
import type { GameDetails } from "@/lib/nfl-api";

/**
 * CoreAreaAdvantage — Option A (Horizontal Split Advantage Bars)
 *
 * Renders backend-provided `core_area_comparison` only. No frontend inference.
 * Self-contained — safe to remove by deleting the single import + usage in Matchup.tsx.
 */

interface Props {
  rows: NonNullable<GameDetails["core_area_comparison"]>;
  awayAbbr: string;
  homeAbbr: string;
}

function pct(n: number): number {
  // Defensive clamp; backend already returns 0..1
  const v = Math.round((n ?? 0) * 100);
  return Math.max(0, Math.min(100, v));
}

export function CoreAreaAdvantageBars({ rows, awayAbbr, homeAbbr }: Props) {
  if (!rows || rows.length === 0) return null;

  return (
    <Card className="mb-6 border-border bg-card">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Core Area Advantage
          </h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Category Edge
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Shows which team holds the edge across each major matchup category.
        </p>

        <div className="space-y-4">
          {rows.map((row) => {
            const away = pct(row.away_score);
            const home = pct(row.home_score);
            const leader = row.leader;
            const isNeutral = leader === "neutral" || away === home;
            const edgeLabel = isNeutral
              ? "Even"
              : leader === "away"
                ? awayAbbr
                : leader === "home"
                  ? homeAbbr
                  : "Even";

            const awayLeads = leader === "away";
            const homeLeads = leader === "home";

            return (
              <div key={row.core_area} className="space-y-1.5">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {row.core_area}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                    Edge:{" "}
                    <span
                      className={
                        isNeutral
                          ? "text-muted-foreground"
                          : "text-foreground font-semibold"
                      }
                    >
                      {edgeLabel}
                    </span>
                    <span className="text-muted-foreground/50">
                      {" "}· {row.metric_count} metrics
                    </span>
                  </span>
                </div>

                <div className="grid grid-cols-[auto_1fr_auto] items-center gap-2">
                  <span
                    className={`w-10 text-right text-[11px] tabular-nums ${
                      awayLeads ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {awayAbbr} {away}%
                  </span>
                  <div
                    className="relative flex h-2 overflow-hidden rounded-full bg-muted/40"
                    aria-label={`${row.core_area}: ${awayAbbr} ${away}% vs ${homeAbbr} ${home}%`}
                  >
                    <div
                      className={`h-full ${
                        awayLeads ? "bg-accent-cool/80" : "bg-accent-cool/40"
                      }`}
                      style={{ width: `${away}%` }}
                    />
                    <div
                      className={`h-full ${
                        homeLeads ? "bg-primary/80" : "bg-primary/40"
                      }`}
                      style={{ width: `${home}%` }}
                    />
                  </div>
                  <span
                    className={`w-12 text-left text-[11px] tabular-nums ${
                      homeLeads ? "font-semibold text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {homeAbbr} {home}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
