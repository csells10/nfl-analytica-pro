import { Card, CardContent } from "@/components/ui/card";
import type { GameDetails } from "@/lib/nfl-api";

interface Props {
  rows: NonNullable<GameDetails["core_area_comparison"]>;
  awayAbbr: string;
  homeAbbr: string;
}

const pct = (n: number) =>
  Math.max(0, Math.min(100, Math.round((n ?? 0) * 100)));

/**
 * Frontend-only relationship microcopy connecting each core area back to the
 * Game Profile signals shown above. Display labels only — never alters scores
 * or model behavior. Matched case-insensitively against backend `core_area`.
 */
const RELATIONSHIP_LABEL: Record<string, string> = {
  "disruption and turnovers": "Supports Pressure + Turnover Risk",
  "scoring efficiency": "Supports Scoring Efficiency",
  "defensive control": "Defensive context",
  "offensive output": "Offensive context",
  "field control": "Field position context",
};

export function CoreAreaAdvantage({ rows, awayAbbr, homeAbbr }: Props) {
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
          Broad team-strength categories behind the matchup signals.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rows.map((row) => {
            const away = pct(row.away_score);
            const home = pct(row.home_score);
            const isNeutral = row.leader === "neutral" || away === home;
            const edgeLabel = isNeutral
              ? "Even"
              : row.leader === "away"
                ? `${awayAbbr} Edge`
                : row.leader === "home"
                  ? `${homeAbbr} Edge`
                  : "Even";

            const relationship = RELATIONSHIP_LABEL[row.core_area.toLowerCase()];

            return (
              <div
                key={row.core_area}
                className="rounded-md border border-border/60 bg-muted/5 p-3 transition-colors hover:border-border/80 hover:bg-muted/10"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {row.core_area}
                  </span>
                  <span
                    className={`text-[10px] uppercase tracking-[0.1em] ${
                      isNeutral
                        ? "text-muted-foreground"
                        : "font-semibold text-foreground"
                    }`}
                  >
                    {edgeLabel}
                  </span>
                </div>

                {relationship && (
                  <p className="mb-2 text-[10px] text-muted-foreground/70">
                    {relationship}
                  </p>
                )}

                <div className="mb-1.5 flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span
                    className={
                      row.leader === "away" && !isNeutral
                        ? "font-semibold text-foreground"
                        : ""
                    }
                  >
                    {awayAbbr} {away}%
                  </span>
                  <span
                    className={
                      row.leader === "home" && !isNeutral
                        ? "font-semibold text-foreground"
                        : ""
                    }
                  >
                    {homeAbbr} {home}%
                  </span>
                </div>

                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={`h-full ${
                      row.leader === "away" ? "bg-accent-cool/80" : "bg-accent-cool/35"
                    }`}
                    style={{ width: `${away}%` }}
                  />
                  <div
                    className={`h-full ${
                      row.leader === "home" ? "bg-primary/80" : "bg-primary/35"
                    }`}
                    style={{ width: `${home}%` }}
                  />
                </div>

                <p
                  className="mt-2 text-[10px] text-muted-foreground/60"
                  title={`${row.metric_count} metrics included in this category score`}
                >
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
