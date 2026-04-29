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
 * Frontend-only display mapping that connects Core Area categories to the
 * Game Profile signals shown above. These are presentational labels — they
 * never alter scores or model behavior. Keys are matched case-insensitively
 * against the backend `core_area` string.
 */
type Accent = "amber" | "blue" | "neutral" | "cool";

interface CoreAreaDisplay {
  tags: string[];
  accent: Accent;
}

const CORE_AREA_DISPLAY: Record<string, CoreAreaDisplay> = {
  "disruption and turnovers": {
    tags: ["Pressure", "Turnover Risk"],
    accent: "amber",
  },
  "scoring efficiency": {
    tags: ["Scoring Efficiency"],
    accent: "blue",
  },
  "defensive control": {
    tags: ["Defensive Support"],
    accent: "neutral",
  },
  "offensive output": {
    tags: ["Offensive Strength"],
    accent: "cool",
  },
};

const ACCENT_BAR: Record<Accent, { lead: string; trail: string }> = {
  amber: { lead: "bg-level-elevated/80", trail: "bg-level-elevated/25" },
  blue: { lead: "bg-level-moderate/80", trail: "bg-level-moderate/25" },
  neutral: { lead: "bg-muted-foreground/70", trail: "bg-muted-foreground/20" },
  cool: { lead: "bg-accent-cool/80", trail: "bg-accent-cool/25" },
};

function getDisplay(coreArea: string): CoreAreaDisplay {
  return (
    CORE_AREA_DISPLAY[coreArea.toLowerCase()] ?? {
      tags: [],
      accent: "cool",
    }
  );
}

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
          Category-level strengths behind the matchup signals.
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

            const display = getDisplay(row.core_area);
            const bar = isNeutral
              ? { lead: "bg-muted-foreground/40", trail: "bg-muted-foreground/20" }
              : ACCENT_BAR[display.accent];

            return (
              <div
                key={row.core_area}
                className="group rounded-md border border-border/70 bg-muted/10 p-3 transition-colors hover:border-accent-cool/40 hover:bg-muted/20"
              >
                <div className="mb-1.5 flex items-baseline justify-between gap-2">
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

                {display.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1">
                    {display.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-sm border border-border/60 bg-background/40 px-1.5 py-0.5 text-[9.5px] uppercase tracking-[0.08em] text-muted-foreground/80"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
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

                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40 transition-opacity group-hover:opacity-95">
                  <div
                    className={`h-full ${
                      row.leader === "away" ? bar.lead : bar.trail
                    }`}
                    style={{ width: `${away}%` }}
                  />
                  <div
                    className={`h-full ${
                      row.leader === "home" ? bar.lead : bar.trail
                    }`}
                    style={{ width: `${home}%` }}
                  />
                </div>

                <p
                  className="mt-2 text-[10px] text-muted-foreground/70"
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
