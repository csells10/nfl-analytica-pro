import { Card, CardContent } from "@/components/ui/card";
import type { GameDetails } from "@/lib/nfl-api";

interface Props {
  rows: NonNullable<GameDetails["core_area_comparison"]>;
  awayAbbr: string;
  homeAbbr: string;
}

const pct = (n: number) => Math.max(0, Math.min(100, Math.round((n ?? 0) * 100)));

export function CoreAreaAdvantageCards({ rows, awayAbbr, homeAbbr }: Props) {
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

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {rows.map((row) => {
            const away = pct(row.away_score);
            const home = pct(row.home_score);
            const isNeutral = row.leader === "neutral" || away === home;
            const edge = isNeutral
              ? "Even"
              : row.leader === "away"
                ? awayAbbr
                : row.leader === "home"
                  ? homeAbbr
                  : "Even";

            return (
              <div
                key={row.core_area}
                className="rounded-md border border-border/70 bg-muted/10 p-3"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {row.core_area}
                  </span>
                  <span className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/70">
                    Edge:{" "}
                    <span
                      className={
                        isNeutral
                          ? "text-muted-foreground"
                          : "font-semibold text-foreground"
                      }
                    >
                      {edge}
                    </span>
                  </span>
                </div>

                <div className="mb-2 flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span>
                    {awayAbbr} {away}%
                  </span>
                  <span>
                    {homeAbbr} {home}%
                  </span>
                </div>

                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={`h-full ${
                      row.leader === "away" ? "bg-accent-cool/80" : "bg-accent-cool/40"
                    }`}
                    style={{ width: `${away}%` }}
                  />
                  <div
                    className={`h-full ${
                      row.leader === "home" ? "bg-primary/80" : "bg-primary/40"
                    }`}
                    style={{ width: `${home}%` }}
                  />
                </div>

                <p className="mt-2 text-[10px] text-muted-foreground/70">
                  {row.metric_count} metrics
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
