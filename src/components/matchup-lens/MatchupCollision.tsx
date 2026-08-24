import { Card, CardContent } from "@/components/ui/card";
import type {
  CollisionDirection,
  CollisionLane,
  CoverageState,
} from "@/lib/matchup-lens-collision";
import { collisionHighlights } from "@/lib/matchup-lens-collision";
import { betterThanText, scoreText } from "@/lib/matchup-lens-language";
import type { TraceHandlers } from "./TraceChips";

interface MatchupCollisionProps extends TraceHandlers {
  directions: CollisionDirection[];
  selectedKey: string | null;
  onSelect: (collisionKey: string) => void;
}

const COVERAGE_LABEL: Record<CoverageState, string> = {
  ready: "Ready",
  partial: "Partial",
  "not-supported": "Not supported",
};

function coverageClass(coverage: CoverageState): string {
  if (coverage === "ready") return "border-border bg-muted/40 text-foreground";
  if (coverage === "partial") return "border-dashed border-border text-muted-foreground";
  return "border-dashed border-border text-muted-foreground/80";
}

function LaneCard({
  lane,
  offenseAbv,
  defenseAbv,
  isSelected,
  onSelect,
  onOpenTrace,
}: {
  lane: CollisionLane;
  offenseAbv: string;
  defenseAbv: string;
  isSelected: boolean;
  onSelect: (key: string) => void;
} & TraceHandlers) {
  return (
    <div
      data-collision-key={lane.key}
      data-coverage={lane.coverage}
      className={`rounded-md border p-3 transition-colors ${
        isSelected ? "border-foreground/30 bg-secondary" : "border-border bg-muted/10"
      }`}
    >
      <button
        type="button"
        onClick={() => onSelect(lane.key)}
        aria-pressed={isSelected}
        className="w-full text-left"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-semibold text-foreground">{lane.definition.name}</span>
          <span
            className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${coverageClass(lane.coverage)}`}
          >
            {COVERAGE_LABEL[lane.coverage]}
          </span>
        </div>
        <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
          {lane.definition.question}
        </p>
      </button>

      <div className="mt-2.5 grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <p className="font-semibold text-accent-cool">
            {offenseAbv} · {lane.offense.label}
          </p>
          <p className="tabular-nums text-foreground">{scoreText(lane.offense.score)}</p>
        </div>
        <div>
          <p className="font-semibold text-primary">
            {defenseAbv} · {lane.defense.label}
          </p>
          <p className="tabular-nums text-foreground">{scoreText(lane.defense.score)}</p>
        </div>
      </div>

      <p className="mt-2 text-[11px] text-muted-foreground" data-testid={`collision-edge-${lane.key}`}>
        {lane.edge === null
          ? "No edge declared — coverage is insufficient."
          : `Edge ${Math.abs(lane.edge).toFixed(1)} to ${
              lane.leader === "offense" ? offenseAbv : lane.leader === "defense" ? defenseAbv : "neither team"
            }.`}
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground/80">{lane.coverageNote}</p>

      <div className="mt-2 space-y-1">
        {[...lane.offense.metrics, ...lane.defense.metrics].map((metric) => (
          <button
            key={`${lane.key}-${metric.metric}`}
            type="button"
            data-metric={metric.metric}
            onClick={() => onOpenTrace({ type: "metric", id: metric.metric })}
            className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded border border-transparent px-1.5 py-1 text-left text-[11px] transition-colors hover:border-border hover:bg-muted/30"
          >
            <span className="text-foreground">{metric.label}</span>
            <span className="text-muted-foreground">{betterThanText(metric.percentile)}</span>
          </button>
        ))}
        {[...lane.offense.missing, ...lane.defense.missing].map((metric) => (
          <p key={`${lane.key}-missing-${metric}`} className="px-1.5 text-[11px] text-muted-foreground/70">
            Missing from snapshot: <span className="font-mono">{metric}</span>
          </p>
        ))}
      </div>
    </div>
  );
}

/**
 * Opponent-aware view with two directional lanes. Collisions only exist where
 * the snapshot carries metrics for both sides of the interaction.
 */
export function MatchupCollision({
  directions,
  selectedKey,
  onSelect,
  onOpenTrace,
}: MatchupCollisionProps) {
  const { strongest, closest } = collisionHighlights(directions);

  return (
    <Card className="border-border bg-card" data-testid="matchup-collision">
      <CardContent className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Where profiles collide
        </h3>
        {strongest ? (
          <p className="mt-1.5 text-xs leading-relaxed text-foreground" data-testid="collision-lead">
            With {strongest.direction.offenseAbv} holding the ball, their{" "}
            {strongest.lane.offense.label.toLowerCase()} profile meets{" "}
            {strongest.direction.defenseAbv}&rsquo;s {strongest.lane.defense.label.toLowerCase()}{" "}
            profile — the widest supported pairing in this matchup. Every other supported pairing
            follows below.
          </p>
        ) : (
          <p className="mt-1.5 text-xs text-muted-foreground" data-testid="collision-unsupported">
            No supported collision identified — the snapshot lacks a counterpart metric for one side
            of every interaction.
          </p>
        )}
        <p className="mt-1 text-[11px] italic text-muted-foreground/80">
          Profile matchup, not a forecast. Each lane pairs the team holding the ball against the
          opposing side of the same interaction.
        </p>

        {closest && (
          <p className="mt-2 text-[11px] text-muted-foreground" data-testid="collision-highlights">
            Closest supported pairing: {closest.lane.definition.name} (
            {closest.direction.offenseAbv} with the ball).
          </p>
        )}


        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          {directions.map((direction) => (
            <div key={`${direction.offenseAbv}-${direction.defenseAbv}`} className="min-w-0">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-foreground">
                When {direction.offenseAbv} has the ball
                <span className="ml-1.5 font-normal normal-case tracking-normal text-muted-foreground">
                  {direction.offenseAbv} offense vs {direction.defenseAbv} defense
                </span>
              </p>
              <div className="space-y-2">
                {direction.lanes.map((lane) => (
                  <LaneCard
                    key={`${direction.offenseAbv}-${lane.key}`}
                    lane={lane}
                    offenseAbv={direction.offenseAbv}
                    defenseAbv={direction.defenseAbv}
                    isSelected={lane.key === selectedKey}
                    onSelect={onSelect}
                    onOpenTrace={onOpenTrace}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
