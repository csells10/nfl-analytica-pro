import { Card, CardContent } from "@/components/ui/card";
import type { LensGap } from "@/lib/matchup-lens-compare";
import { sortBySeparation } from "@/lib/matchup-lens-compare";

export type AdvantageOrder = "separation" | "canonical";

interface AdvantageMapProps {
  gaps: LensGap[];
  labelA: string;
  labelB: string;
  selectedKey: string;
  onSelect: (key: string) => void;
  order: AdvantageOrder;
  onOrderChange: (order: AdvantageOrder) => void;
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Six horizontal dumbbell rows on one fixed 0-100 scale, ordered by absolute
 * separation so the biggest difference is readable immediately.
 */
export function AdvantageMap({
  gaps,
  labelA,
  labelB,
  selectedKey,
  onSelect,
  order,
  onOrderChange,
}: AdvantageMapProps) {
  const rows = order === "separation" ? sortBySeparation(gaps) : gaps;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Advantage Map</h3>
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
            {labelA}
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            {labelB}
          </span>
          <span className="text-muted-foreground">Scale 0–100 percentile</span>
        </div>

        <ul className="mt-4 space-y-1" data-testid="advantage-rows">
          {rows.map((row) => {
            const isSelected = row.key === selectedKey;
            const a = clamp(row.scoreA ?? 0);
            const b = clamp(row.scoreB ?? 0);
            const left = Math.min(a, b);
            const width = Math.abs(a - b);
            return (
              <li key={row.key}>
                <button
                  type="button"
                  onClick={() => onSelect(row.key)}
                  aria-pressed={isSelected}
                  data-lens-key={row.key}
                  className={`w-full rounded-md border px-3 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "border-foreground/30 bg-secondary"
                      : "border-transparent hover:border-border hover:bg-muted/30"
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-semibold text-foreground">{row.name}</span>
                    <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                      {row.absGap === null ? "—" : `${row.gap! > 0 ? "+" : row.gap! < 0 ? "−" : "±"}${row.absGap.toFixed(1)}`}
                      <span className={`ml-1.5 ${row.leader === "a" ? "text-accent-cool" : row.leader === "b" ? "text-primary" : ""}`}>
                        {row.leader === "a" ? labelA : row.leader === "b" ? labelB : "even"}
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

                  <div className="mt-1.5 flex items-baseline gap-3 font-mono text-[11px] tabular-nums">
                    <span className="text-accent-cool">
                      {labelA} {row.scoreA === null ? "—" : row.scoreA.toFixed(1)}
                    </span>
                    <span className="text-primary">
                      {labelB} {row.scoreB === null ? "—" : row.scoreB.toFixed(1)}
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
