import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LensDefinition, LensScore } from "@/lib/matchup-lens";
import type { LensSnapshot, TeamMetricRow } from "@/lib/matchup-lens-types";
import { lensStanding } from "@/lib/matchup-lens-rank";
import {
  LENS_SCORE_EXPLANATION,
  LENS_SCORE_MATH,
  scoreText,
  rankText,
} from "@/lib/matchup-lens-language";
import { lensDefinition } from "@/lib/matchup-lens-glossary";
import { ScoreBlock, TagChip, type TraceHandlers } from "./TraceChips";
import { EvidenceRail } from "./EvidenceRail";

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
  onClose?: () => void;
}

/** A lens is "close" when the two profiles sit within a few points of each other. */
const CLOSE_THRESHOLD = 5;

const FIRST_CARDS = 3;

/**
 * Evidence for one deliberately selected lens: what the score means, where each
 * team stands, the most explanatory metrics, and the signals behind them.
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
  onClose,
}: LensDetailProps) {
  const [showAll, setShowAll] = useState(false);

  const percentileB = useMemo(
    () => new Map(scoreB.contributions.map((c) => [c.metric, c.percentile])),
    [scoreB],
  );
  const rows = scoreA.contributions.length > 0 ? scoreA.contributions : scoreB.contributions;

  /** Most explanatory first: influence, then the widest matchup difference. */
  const ordered = useMemo(
    () =>
      [...rows].sort((left, right) => {
        if (right.weight !== left.weight) return right.weight - left.weight;
        const gapLeft = Math.abs(left.percentile - (percentileB.get(left.metric) ?? left.percentile));
        const gapRight = Math.abs(
          right.percentile - (percentileB.get(right.metric) ?? right.percentile),
        );
        return gapRight - gapLeft;
      }),
    [rows, percentileB],
  );

  const visible = showAll ? ordered : ordered.slice(0, FIRST_CARDS);

  const standingA = lensStanding(snapshot, lens.key, teamA.teamAbv);
  const standingB = lensStanding(snapshot, lens.key, teamB.teamAbv);

  const a = scoreA.score;
  const b = scoreB.score;
  const heading =
    a === null || b === null
      ? `${lens.name} evidence`
      : Math.abs(a - b) < CLOSE_THRESHOLD
        ? `Why these teams are close in ${lens.name}`
        : `Why ${a > b ? labelA : labelB} leads in ${lens.name}`;

  const plainRead =
    a === null || b === null
      ? "One side of this lens has no league-relative value in the current snapshot."
      : Math.abs(a - b) < CLOSE_THRESHOLD
        ? `${labelA} and ${labelB} hold near-identical league standings here — ${Math.abs(a - b).toFixed(1)} points apart.`
        : `${a > b ? nameA : nameB} holds the stronger league-relative standing here — ${Math.abs(a - b).toFixed(1)} points apart.`;

  return (
    <Card className="border-border bg-card" data-testid="lens-evidence" data-lens-key={lens.key}>
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">{heading}</h3>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close lens evidence"
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <p className="mt-1 text-xs leading-relaxed text-foreground" data-testid="lens-definition">
          {lensDefinition(lens.key)}
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground" data-testid="lens-plain-read">
          {plainRead}
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
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

        <p className="mt-2 font-mono text-[11px] text-muted-foreground">
          {labelA} {scoreText(scoreA.score)} · {rankText(standingA.rank, standingA.total)} ·{" "}
          {labelB} {scoreText(scoreB.score)} · {rankText(standingB.rank, standingB.total)}
        </p>

        <div className="mt-4">
          <EvidenceRail
            rows={visible}
            percentileB={percentileB}
            snapshot={snapshot}
            teamAbvA={teamA.teamAbv}
            teamAbvB={teamB.teamAbv}
            labelA={labelA}
            labelB={labelB}
            onOpenTrace={onOpenTrace}
          />
          {ordered.length > FIRST_CARDS && (
            <button
              type="button"
              data-testid="toggle-all-evidence"
              onClick={() => setShowAll((value) => !value)}
              className="mt-2 min-h-[44px] rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {showAll ? "Show key evidence only" : `View all evidence (${ordered.length})`}
            </button>
          )}
        </div>

        <details className="mt-4 rounded-md border border-border bg-muted/10 p-2.5" data-testid="signals-used">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground">
            Signals used
          </summary>
          <p className="mt-1.5 text-[11px] text-muted-foreground">
            Select a signal to trace which metrics and lenses it connects.
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {lens.tags.map((tag) => (
              <TagChip key={tag} tag={tag} onOpenTrace={onOpenTrace} />
            ))}
            {lens.excludeTags?.map((tag) => (
              <TagChip key={tag} tag={tag} excluded onOpenTrace={onOpenTrace} />
            ))}
          </div>
        </details>

        <details className="mt-2 rounded-md border border-border bg-muted/10 p-2.5">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground">
            How this score is built
          </summary>
          <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
            {LENS_SCORE_MATH}
          </p>
          <ul className="mt-1.5 space-y-0.5 font-mono text-[10px] text-muted-foreground">
            <li>Primary signal = weight 2 · Supporting signal = weight 1</li>
            <li>volume-sensitive × 0.5 · volatility × 0.75</li>
          </ul>
        </details>

        <button
          type="button"
          data-testid="open-technical-map"
          onClick={() => onOpenTrace({ type: "tag", id: lens.tags[0] })}
          className="mt-2 inline-flex min-h-[44px] items-center rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[32px]"
        >
          Open technical map
        </button>
      </CardContent>
    </Card>
  );
}
