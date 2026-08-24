import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { LensDefinition, LensScore } from "@/lib/matchup-lens";
import { betterThanText, rankText } from "@/lib/matchup-lens-language";
import { metricStanding } from "@/lib/matchup-lens-rank";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import type { TraceHandlers } from "./TraceChips";

export type PortraitColorMode = "team" | "gap";

export interface PortraitBubble {
  metric: string;
  label: string;
  weight: number;
  /** Share of the lens's total influence, 0-1. */
  share: number;
  percentileA: number | null;
  percentileB: number | null;
  gap: number | null;
  x: number;
  y: number;
  r: number;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const OUTER = 148;

/**
 * Deterministic circle packing: the largest contributor sits in the middle and
 * the rest fill concentric rings, sized by influence share. Metrics are never
 * duplicated even though tags are many-to-many.
 */
export function buildPortrait(score: LensScore, other: LensScore): PortraitBubble[] {
  const otherByMetric = new Map(other.contributions.map((c) => [c.metric, c.percentile]));
  const rows = [...score.contributions].sort((left, right) => right.weight - left.weight);
  const totalWeight = rows.reduce((sum, row) => sum + row.weight, 0) || 1;

  const rings: { count: number; radius: number; bubble: number }[] = [
    { count: 1, radius: 0, bubble: 34 },
    { count: 6, radius: 62, bubble: 26 },
    { count: 12, radius: 112, bubble: 22 },
    { count: 18, radius: 140, bubble: 15 },
  ];

  const bubbles: PortraitBubble[] = [];
  let index = 0;
  for (const ring of rings) {
    for (let slot = 0; slot < ring.count && index < rows.length; slot += 1, index += 1) {
      const row = rows[index];
      const share = row.weight / totalWeight;
      const angle = (Math.PI * 2 * slot) / ring.count - Math.PI / 2;
      const maxWeight = rows[0].weight || 1;
      const r = Math.max(9, ring.bubble * Math.sqrt(row.weight / maxWeight));
      const percentileB = otherByMetric.get(row.metric);
      bubbles.push({
        metric: row.metric,
        label: row.label,
        weight: row.weight,
        share,
        percentileA: row.percentile,
        percentileB: typeof percentileB === "number" ? percentileB : null,
        gap: typeof percentileB === "number" ? row.percentile - percentileB : null,
        x: CENTER + Math.cos(angle) * ring.radius,
        y: CENTER + Math.sin(angle) * ring.radius,
        r,
      });
    }
  }
  return bubbles;
}

interface LensPortraitProps extends TraceHandlers {
  lens: LensDefinition;
  snapshot: LensSnapshot;
  scoreA: LensScore;
  scoreB: LensScore;
  teamAbvA: string;
  labelA: string;
  labelB: string;
}

export function LensPortrait({
  lens,
  snapshot,
  scoreA,
  scoreB,
  teamAbvA,
  labelA,
  labelB,
  onOpenTrace,
}: LensPortraitProps) {
  const [colorMode, setColorMode] = useState<PortraitColorMode>("team");
  const bubbles = buildPortrait(scoreA, scoreB);

  const intensity = (bubble: PortraitBubble): number => {
    if (colorMode === "team") return Math.max(0, Math.min(100, bubble.percentileA ?? 0)) / 100;
    if (bubble.gap === null) return 0.15;
    return Math.min(1, Math.abs(bubble.gap) / 100);
  };

  return (
    <Card className="border-border bg-card" data-testid="lens-portrait">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Lens Portrait</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              {lens.name} broken into its supporting metrics. Bubble area shows how much each metric
              influences the Lens Score. Circle areas are approximate — exact values are listed
              below.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setColorMode(colorMode === "team" ? "gap" : "team")}
            data-color-mode={colorMode}
            className="rounded-md border border-border px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
          >
            {colorMode === "team" ? `Colour: ${labelA} strength` : "Colour: matchup gap"}
          </button>
        </div>

        <p className="mt-2 text-[11px] text-muted-foreground" data-testid="portrait-legend">
          {colorMode === "team"
            ? `Darker bubbles mean ${labelA} sits higher against the league on that metric.`
            : `Darker bubbles mean a wider gap between ${labelA} and ${labelB} on that metric.`}
        </p>

        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="mx-auto mt-3 block h-auto w-full max-w-[420px]"
          role="img"
          aria-label={`${lens.name} composition, ${bubbles.length} supporting metrics`}
          data-testid="portrait-svg"
          data-bubble-count={bubbles.length}
        >
          <circle cx={CENTER} cy={CENTER} r={OUTER} className="fill-muted/20 stroke-border" />
          {bubbles.map((bubble) => (
            <g key={bubble.metric}>
              <circle
                cx={bubble.x}
                cy={bubble.y}
                r={bubble.r}
                data-metric={bubble.metric}
                data-influence={bubble.weight}
                className={`cursor-pointer ${colorMode === "team" ? "fill-accent-cool" : "fill-primary"} stroke-card`}
                style={{ opacity: 0.2 + 0.75 * intensity(bubble) }}
                onClick={() => onOpenTrace({ type: "metric", id: bubble.metric })}
              />
            </g>
          ))}
        </svg>

        <ul className="mt-3 space-y-1" data-testid="portrait-list">
          {bubbles.map((bubble) => {
            const standing = metricStanding(snapshot, bubble.metric, teamAbvA);
            return (
              <li key={bubble.metric}>
                <button
                  type="button"
                  data-metric={bubble.metric}
                  data-share={bubble.share.toFixed(4)}
                  onClick={() => onOpenTrace({ type: "metric", id: bubble.metric })}
                  className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left text-[11px] transition-colors hover:border-border hover:bg-muted/30"
                >
                  <span className="text-foreground">{bubble.label}</span>
                  <span className="text-muted-foreground">
                    {(bubble.share * 100).toFixed(1)}% of this lens · {labelA}{" "}
                    {betterThanText(bubble.percentileA)} ·{" "}
                    {rankText(standing.rank, standing.total)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
