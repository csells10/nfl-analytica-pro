import { Card, CardContent } from "@/components/ui/card";
import type { LensGap } from "@/lib/matchup-lens-compare";
import { sortBySeparation } from "@/lib/matchup-lens-compare";
import { rankText, scoreText } from "@/lib/matchup-lens-language";
import { lensStanding } from "@/lib/matchup-lens-rank";
import type { LensSnapshot } from "@/lib/matchup-lens-types";

export type MatchupMapOrder = "separation" | "canonical";

interface MatchupMapProps {
  gaps: LensGap[];
  snapshot: LensSnapshot;
  teamAbvA: string;
  teamAbvB: string;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  selectedKey: string;
  onSelect: (key: string) => void;
  order: MatchupMapOrder;
  onOrderChange: (order: MatchupMapOrder) => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Matchup Map — every lens on one exact shared 0–100 scale so the biggest and
 * smallest differences are readable in a glance. Evolution of the earlier
 * Advantage Map with direct team names, score meaning and gap wording.
 */
export function MatchupMap({
  gaps,
  snapshot,
  teamAbvA,
  teamAbvB,
  labelA,
  labelB,
  nameA,
  nameB,
  selectedKey,
  onSelect,
  order,
  onOrderChange,
}: MatchupMapProps) {
  const rows = order === "separation" ? sortBySeparation(gaps) : gaps;

  return (
    <Card className="border-border bg-card" data-testid="matchup-map">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Matchup Map</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Scan every lens on an exact shared scale.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onOrderChange(order === "separation" ? "canonical" : "separation")}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          >
            {order === "separation" ? "Sorted by gap" : "Lens order"}
          </button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-accent-cool">
            <span className="h-2 w-2 rounded-full bg-accent-cool" aria-hidden />
            {labelA} · {nameA}
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            {labelB} · {nameB}
          </span>
          <span className="text-muted-foreground">
            Lens Score 0–100 · gap is the difference between the two scores
          </span>
        </div>

        <ul className="mt-4 space-y-1" data-testid="advantage-rows">
          {rows.map((row) => {
            const isSelected = row.key === selectedKey;
            const a = clamp(row.scoreA ?? 0);
            const b = clamp(row.scoreB ?? 0);
            const left = Math.min(a, b);
            const width = Math.abs(a - b);
            const standingA = lensStanding(snapshot, row.key, teamAbvA);
            const standingB = lensStanding(snapshot, row.key, teamAbvB);
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onSelect(row.key)}
                  aria-pressed={isSelected}
                  data-lens-key={row.key}
                  className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "border-foreground/40 bg-secondary"
                      : "border-transparent hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{row.name}</span>
                    <span className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                      {row.absGap === null
                        ? "No gap available"
                        : `${row.absGap.toFixed(1)} points apart`}
                      <span
                        className={`ml-1.5 font-semibold ${
                          row.leader === "a"
                            ? "text-accent-cool"
                            : row.leader === "b"
                              ? "text-primary"
                              : ""
                        }`}
                      >
                        {row.leader === "a" ? `${labelA} ahead` : row.leader === "b" ? `${labelB} ahead` : "even"}
                      </span>
                    </span>
                  </div>

                  <div className="relative mt-2 h-4">
                    <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border" />
                    {[25, 50, 75].map((tick) => (
                      <div
                        key={tick}
                        className="absolute top-0 h-full w-px bg-border/70"
                        style={{ left: `${tick}%` }}
                        aria-hidden
                      />
                    ))}
                    <div
                      className="absolute top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-foreground/35"
                      style={{ left: `${left}%`, width: `${width}%` }}
                      aria-hidden
                    />
                    <span
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent-cool"
                      style={{ left: `${a}%` }}
                      aria-hidden
                    />
                    <span
                      className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-primary"
                      style={{ left: `${b}%` }}
                      aria-hidden
                    />
                  </div>
                  <div className="mt-0.5 flex justify-between text-[9px] tabular-nums text-muted-foreground/70">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>

                  <div className="mt-1.5 grid gap-0.5 text-[11px] tabular-nums">
                    <span className="text-accent-cool">
                      {labelA} {scoreText(row.scoreA)} · {rankText(standingA.rank, standingA.total)}
                    </span>
                    <span className="text-primary">
                      {labelB} {scoreText(row.scoreB)} · {rankText(standingB.rank, standingB.total)}
                    </span>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
