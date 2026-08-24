import { useCallback, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { LensGap } from "@/lib/matchup-lens-compare";

interface LensRailProps {
  gaps: LensGap[];
  labelA: string;
  labelB: string;
  selectedKey: string | null;
  onSelect: (lensKey: string) => void;
}

function leaderText(gap: LensGap, labelA: string, labelB: string): string {
  if (gap.absGap === null) return "No gap available";
  if (gap.leader === "a") return `${labelA} +${gap.absGap.toFixed(1)}`;
  if (gap.leader === "b") return `${labelB} +${gap.absGap.toFixed(1)}`;
  return "Even";
}

/**
 * Thin, manually scrolled rail of the six parent lenses. Selecting an item
 * drives the constellation highlight and the evidence area; nothing autoplays.
 */
export function LensRail({ gaps, labelA, labelB, selectedKey, onSelect }: LensRailProps) {
  const scroller = useRef<HTMLDivElement>(null);

  const nudge = useCallback((direction: -1 | 1) => {
    const node = scroller.current;
    if (!node) return;
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    node.scrollBy({ left: direction * 220, behavior: reduced ? "auto" : "smooth" });
  }, []);

  return (
    <section aria-label="Lens rail" data-testid="lens-rail" className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] text-muted-foreground">Select a lens to inspect the evidence.</p>
        <div className="flex shrink-0 gap-1">
          <button
            type="button"
            aria-label="Scroll lenses left"
            onClick={() => nudge(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Scroll lenses right"
            onClick={() => nudge(1)}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={scroller}
        role="group"
        aria-label="Six parent lenses"
        className="mt-1.5 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {gaps.map((gap) => {
          const isSelected = gap.key === selectedKey;
          return (
            <button
              key={gap.key}
              type="button"
              data-lens-key={gap.key}
              aria-pressed={isSelected}
              onClick={() => onSelect(gap.key)}
              className={`min-h-[56px] w-[188px] shrink-0 snap-start rounded-md border px-3 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-foreground/40 bg-secondary"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold text-foreground">
                {gap.name}
              </span>
              <span className="mt-1 flex items-baseline gap-1.5 font-mono text-[11px] tabular-nums">
                <span className="text-accent-cool">
                  {labelA} {gap.scoreA === null ? "—" : gap.scoreA.toFixed(1)}
                </span>
                <span className="text-muted-foreground/60">/</span>
                <span className="text-primary">
                  {labelB} {gap.scoreB === null ? "—" : gap.scoreB.toFixed(1)}
                </span>
              </span>
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                {leaderText(gap, labelA, labelB)}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
