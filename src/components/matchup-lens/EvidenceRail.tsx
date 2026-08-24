import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LensContribution } from "@/lib/matchup-lens";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import { metricStanding } from "@/lib/matchup-lens-rank";
import {
  betterThanText,
  influenceNotes,
  rankText,
  signalRoleLabel,
} from "@/lib/matchup-lens-language";
import { RoleBadge, type TraceHandlers } from "./TraceChips";

interface EvidenceRailProps extends TraceHandlers {
  rows: LensContribution[];
  percentileB: Map<string, number>;
  snapshot: LensSnapshot;
  teamAbvA: string;
  teamAbvB: string;
  labelA: string;
  labelB: string;
}

function Bar({ value, tone }: { value: number | null; tone: "a" | "b" }) {
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${tone === "a" ? "bg-accent-cool" : "bg-primary"}`}
        style={{ width: `${Math.max(0, Math.min(100, value ?? 0))}%` }}
      />
    </div>
  );
}

/**
 * Horizontally scrollable evidence cards: roughly three visible on desktop and a
 * partially visible next card on phones, so the scroll affordance is obvious.
 */
export function EvidenceRail({
  rows,
  percentileB,
  snapshot,
  teamAbvA,
  teamAbvB,
  labelA,
  labelB,
  onOpenTrace,
}: EvidenceRailProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = useCallback((direction: -1 | 1) => {
    const node = scroller.current;
    if (!node) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    node.scrollBy({ left: direction * 240, behavior: reduced ? "auto" : "smooth" });
  }, []);

  return (
    <div className="min-w-0" data-testid="evidence-rail">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Supporting evidence
        </p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Scroll evidence left"
            onClick={() => nudge(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll evidence right"
            onClick={() => nudge(1)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        className="mt-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {rows.map((row) => {
          const other = percentileB.get(row.metric);
          const rankA = metricStanding(snapshot, row.metric, teamAbvA);
          const rankB = metricStanding(snapshot, row.metric, teamAbvB);
          const notes = influenceNotes(row.lensTags);
          return (
            <button
              key={row.metric}
              type="button"
              data-metric={row.metric}
              onClick={() => onOpenTrace({ type: "metric", id: row.metric })}
              className="w-[82%] shrink-0 snap-start rounded-md border border-border bg-muted/10 p-3 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-[calc((100%-1rem)/3)]"
            >
              <span className="block text-xs font-medium text-foreground">{row.label}</span>
              <span className="mt-1.5 flex flex-wrap gap-1">
                <RoleBadge label={signalRoleLabel(row.signalStrength)} />
                {notes.map((note) => (
                  <RoleBadge key={note} label={note} muted />
                ))}
              </span>

              <span className="mt-2 block space-y-1.5">
                <span className="block">
                  <span className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-accent-cool">{labelA}</span>
                    <span className="font-mono text-muted-foreground">
                      {betterThanText(row.percentile)} · {rankText(rankA.rank, rankA.total)}
                    </span>
                  </span>
                  <Bar value={row.percentile} tone="a" />
                </span>
                <span className="block">
                  <span className="flex items-baseline justify-between gap-2 text-[11px]">
                    <span className="text-primary">{labelB}</span>
                    <span className="font-mono text-muted-foreground">
                      {betterThanText(typeof other === "number" ? other : null)} ·{" "}
                      {rankText(rankB.rank, rankB.total)}
                    </span>
                  </span>
                  <Bar value={typeof other === "number" ? other : null} tone="b" />
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
