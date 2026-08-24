import { Card, CardContent } from "@/components/ui/card";
import type { LensDefinition, LensScore } from "@/lib/matchup-lens";
import type { LensSnapshot, TeamMetricRow } from "@/lib/matchup-lens-types";
import { lensStanding, metricStanding } from "@/lib/matchup-lens-rank";
import {
  LENS_SCORE_EXPLANATION,
  LENS_SCORE_MATH,
  betterThanText,
  influenceNotes,
  rankText,
  signalRoleLabel,
} from "@/lib/matchup-lens-language";
import { RoleBadge, ScoreBlock, TagChip, type TraceHandlers } from "./TraceChips";

interface LensDetailProps extends TraceHandlers {
  lens: LensDefinition;
  snapshot: LensSnapshot;
  teamA: TeamMetricRow;
  teamB: TeamMetricRow;
  scoreA: LensScore;
  scoreB: LensScore;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
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
 * Shared evidence panel for every experience: Lens Score, league standing, the
 * lens tags behind it and each supporting metric. Tags and metrics open the
 * reverse trace.
 */
export function LensDetail({
  lens,
  snapshot,
  teamA,
  teamB,
  scoreA,
  scoreB,
  labelA,
  labelB,
  nameA,
  nameB,
  onOpenTrace,
}: LensDetailProps) {
  const percentileB = new Map(scoreB.contributions.map((c) => [c.metric, c.percentile]));
  const rows = scoreA.contributions.length > 0 ? scoreA.contributions : scoreB.contributions;
  const standingA = lensStanding(snapshot, lens.key, teamA.teamAbv);
  const standingB = lensStanding(snapshot, lens.key, teamB.teamAbv);

  return (
    <Card className="border-border bg-card" data-testid="lens-evidence">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{lens.name}</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Lens Score
          </span>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
          {LENS_SCORE_EXPLANATION}
        </p>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <ScoreBlock
            teamLabel={labelA}
            teamName={nameA}
            score={scoreA.score}
            standing={standingA}
            tone="a"
          />
          <ScoreBlock
            teamLabel={labelB}
            teamName={nameB}
            score={scoreB.score}
            standing={standingB}
            tone="b"
          />
        </div>

        <details className="mt-3 rounded-md border border-border bg-muted/10 p-2.5">
          <summary className="cursor-pointer text-[11px] font-semibold text-foreground">
            How this score is built
          </summary>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {LENS_SCORE_MATH}
          </p>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-muted-foreground">
            <li>Primary signal = weight 2 · Supporting context = weight 1</li>
            <li>volume-sensitive × 0.5 · volatility × 0.75</li>
          </ul>
        </details>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Lens tags — select one to trace it
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lens.tags.map((tag) => (
              <TagChip key={tag} tag={tag} onOpenTrace={onOpenTrace} />
            ))}
            {lens.excludeTags?.map((tag) => (
              <TagChip key={tag} tag={tag} excluded onOpenTrace={onOpenTrace} />
            ))}
          </div>
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Supporting metrics ({rows.length}) — select one to trace it
          </p>
          <ul className="mt-2 space-y-3">
            {rows.map((row) => {
              const other = percentileB.get(row.metric);
              const rankA = metricStanding(snapshot, row.metric, teamA.teamAbv);
              const rankB = metricStanding(snapshot, row.metric, teamB.teamAbv);
              const notes = influenceNotes(row.lensTags);
              return (
                <li key={row.metric}>
                  <button
                    type="button"
                    data-metric={row.metric}
                    onClick={() => onOpenTrace({ type: "metric", id: row.metric })}
                    className="w-full rounded-md border border-transparent p-2 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:border-border focus-visible:bg-muted/30"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-xs font-medium text-foreground">{row.label}</span>
                      <span className="flex flex-wrap items-center gap-1">
                        <RoleBadge label={signalRoleLabel(row.signalStrength)} />
                        {notes.map((note) => (
                          <RoleBadge key={note} label={note} muted />
                        ))}
                      </span>
                    </div>

                    <div className="mt-2 space-y-1.5">
                      {[
                        { label: labelA, value: row.percentile, tone: "a" as const, standing: rankA },
                        {
                          label: labelB,
                          value: typeof other === "number" ? other : null,
                          tone: "b" as const,
                          standing: rankB,
                        },
                      ].map((side) => (
                        <div key={side.label}>
                          <div className="flex items-baseline justify-between gap-2 text-[11px]">
                            <span
                              className={
                                side.tone === "a" ? "text-accent-cool" : "text-primary"
                              }
                            >
                              {side.label}
                            </span>
                            <span className="text-muted-foreground">
                              {betterThanText(side.value)} ·{" "}
                              {rankText(side.standing.rank, side.standing.total)}
                            </span>
                          </div>
                          <PercentileBar value={side.value ?? 0} tone={side.tone} />
                        </div>
                      ))}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
