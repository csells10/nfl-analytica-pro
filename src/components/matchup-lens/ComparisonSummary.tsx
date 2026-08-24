import type { LensGap } from "@/lib/matchup-lens-compare";
import { comparisonHighlights } from "@/lib/matchup-lens-compare";

interface ComparisonSummaryProps {
  gaps: LensGap[];
  labelA: string;
  labelB: string;
  onSelect: (lensKey: string) => void;
}

function leaderLabel(gap: LensGap, labelA: string, labelB: string): string {
  if (gap.leader === "a") return labelA;
  if (gap.leader === "b") return labelB;
  return "even";
}

/**
 * Two calculated statements only: where the percentile separation is largest
 * and where it is smallest. No projection, no football interpretation.
 */
export function ComparisonSummary({ gaps, labelA, labelB, onSelect }: ComparisonSummaryProps) {
  const { largest, closest } = comparisonHighlights(gaps);
  if (!largest || !closest) return null;

  const cards = [
    { key: largest.key, title: "Largest separation", gap: largest },
    { key: closest.key, title: "Closest lens", gap: closest },
  ];

  return (
    <div className="grid gap-2 sm:grid-cols-2" data-testid="comparison-summary">
      {cards.map((card) => (
        <button
          key={card.title}
          type="button"
          onClick={() => onSelect(card.gap.key)}
          className="rounded-md border border-border bg-muted/20 p-3 text-left transition-colors hover:border-muted-foreground/40"
        >
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {card.title}
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{card.gap.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums text-foreground">
              {(card.gap.absGap ?? 0).toFixed(1)}
            </span>{" "}
            percentile points ·{" "}
            <span className={card.gap.leader === "a" ? "text-accent-cool" : "text-primary"}>
              {leaderLabel(card.gap, labelA, labelB)}
            </span>{" "}
            ahead
          </p>
        </button>
      ))}
    </div>
  );
}
