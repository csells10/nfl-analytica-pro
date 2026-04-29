import { Card, CardContent } from "@/components/ui/card";
import type { GameDetails } from "@/lib/nfl-api";

interface Props {
  rows: NonNullable<GameDetails["core_area_comparison"]>;
  awayAbbr: string;
  homeAbbr: string;
}

const pct = (n: number) => Math.max(0, Math.min(100, Math.round((n ?? 0) * 100)));

export function CoreAreaAdvantageDumbbell({ rows, awayAbbr, homeAbbr }: Props) {
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

        {/* Scale legend */}
        <div className="mb-2 grid grid-cols-[140px_1fr_90px] items-center gap-3">
          <span />
          <div className="flex justify-between text-[9px] uppercase tracking-wider text-muted-foreground/50">
            <span>0</span>
            <span>50</span>
            <span>100</span>
          </div>
          <span />
        </div>

        <div className="space-y-3">
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

            const lo = Math.min(away, home);
            const hi = Math.max(away, home);

            return (
              <div
                key={row.core_area}
                className="grid grid-cols-[140px_1fr_90px] items-center gap-3"
              >
                <span className="truncate text-xs font-medium text-foreground">
                  {row.core_area}
                </span>

                <div className="relative h-5">
                  {/* Track */}
                  <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                  {/* Connector */}
                  <div
                    className="absolute top-1/2 h-[2px] -translate-y-1/2 bg-muted-foreground/40"
                    style={{ left: `${lo}%`, width: `${hi - lo}%` }}
                  />
                  {/* Away dot */}
                  <div
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-cool ring-2 ring-card"
                    style={{ left: `${away}%` }}
                    title={`${awayAbbr} ${away}%`}
                  />
                  {/* Home dot */}
                  <div
                    className="absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary ring-2 ring-card"
                    style={{ left: `${home}%` }}
                    title={`${homeAbbr} ${home}%`}
                  />
                </div>

                <div className="flex flex-col items-end text-[10px] leading-tight">
                  <span
                    className={
                      isNeutral
                        ? "text-muted-foreground"
                        : "font-semibold text-foreground"
                    }
                  >
                    {edge}
                  </span>
                  <span className="text-muted-foreground/60">
                    {row.metric_count} metrics
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dot legend */}
        <div className="mt-4 flex items-center gap-4 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-cool" />
            {awayAbbr}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-primary" />
            {homeAbbr}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
