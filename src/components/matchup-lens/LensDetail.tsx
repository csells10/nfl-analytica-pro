import { Card, CardContent } from "@/components/ui/card";
import type { LensDefinition, LensScore } from "@/lib/matchup-lens";

interface LensDetailProps {
  lens: LensDefinition;
  scoreA: LensScore;
  scoreB: LensScore;
  labelA: string;
  labelB: string;
}

function PercentileBar({ value, tone }: { value: number; tone: "a" | "b" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${tone === "a" ? "bg-accent-cool" : "bg-primary"}`}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

/**
 * Shows what sits behind the selected lens: raw lens tags, both team scores and
 * every supporting metric percentile that fed the weighted average.
 */
export function LensDetail({ lens, scoreA, scoreB, labelA, labelB }: LensDetailProps) {
  const percentileB = new Map(scoreB.contributions.map((c) => [c.metric, c.percentile]));
  const rows = scoreA.contributions.length > 0 ? scoreA.contributions : scoreB.contributions;

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{lens.name}</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Weighted percentile
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { label: labelA, score: scoreA.score, tone: "a" as const },
            { label: labelB, score: scoreB.score, tone: "b" as const },
          ].map((side) => (
            <div key={side.label} className="rounded-md border border-border bg-muted/20 p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {side.label}
              </p>
              <p
                className={`mt-1 text-2xl font-semibold tabular-nums ${
                  side.tone === "a" ? "text-accent-cool" : "text-primary"
                }`}
              >
                {side.score === null ? "—" : side.score.toFixed(1)}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lens tags
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lens.tags.map((tag) => (
              <span
                key={tag}
                className="rounded border border-border bg-secondary px-1.5 py-0.5 font-mono text-[10px] text-secondary-foreground"
              >
                {tag}
              </span>
            ))}
            {lens.excludeTags?.map((tag) => (
              <span
                key={tag}
                className="rounded border border-dashed border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground line-through"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Supporting metrics ({rows.length})
          </p>
          <ul className="mt-2 space-y-3">
            {rows.map((row) => {
              const other = percentileB.get(row.metric);
              return (
                <li key={row.metric}>
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-xs text-foreground">{row.label}</span>
                    <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
                      {row.signalStrength === "strong" ? "strong" : "supporting"} · w{row.weight}
                    </span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-[3rem_1fr] items-center gap-2">
                    <span className="text-right font-mono text-[11px] tabular-nums text-accent-cool">
                      {row.percentile.toFixed(1)}
                    </span>
                    <PercentileBar value={row.percentile} tone="a" />
                    <span className="text-right font-mono text-[11px] tabular-nums text-primary">
                      {typeof other === "number" ? other.toFixed(1) : "—"}
                    </span>
                    <PercentileBar value={typeof other === "number" ? other : 0} tone="b" />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
