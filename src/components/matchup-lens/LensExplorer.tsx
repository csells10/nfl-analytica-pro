import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { LensGap } from "@/lib/matchup-lens-compare";
import { LENS_GLOSSARY } from "@/lib/matchup-lens-glossary";
import { rankText } from "@/lib/matchup-lens-language";
import { lensStanding } from "@/lib/matchup-lens-rank";
import type { LensSnapshot } from "@/lib/matchup-lens-types";

interface LensExplorerProps {
  gaps: LensGap[];
  snapshot: LensSnapshot;
  teamAbvA: string;
  teamAbvB: string;
  labelA: string;
  labelB: string;
  selectedKey: string | null;
  onSelect: (lensKey: string) => void;
}

/**
 * The library view: a football question per lens, its definition, both Lens
 * Scores, and one click into the evidence.
 */
export function LensExplorer({
  gaps,
  snapshot,
  teamAbvA,
  teamAbvB,
  labelA,
  labelB,
  selectedKey,
  onSelect,
}: LensExplorerProps) {
  return (
    <Card className="border-border bg-card" data-testid="lens-explorer">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">All six lenses</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Choose a football question, then inspect the evidence behind it.
        </p>

        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {gaps.map((gap) => {
            const entry = LENS_GLOSSARY[gap.key];
            const isSelected = gap.key === selectedKey;
            const standingA = lensStanding(snapshot, gap.key, teamAbvA);
            const standingB = lensStanding(snapshot, gap.key, teamAbvB);
            return (
              <li key={gap.key}>
                <button
                  type="button"
                  data-lens-key={gap.key}
                  aria-pressed={isSelected}
                  onClick={() => onSelect(gap.key)}
                  className={`flex min-h-[44px] w-full cursor-pointer flex-col rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    isSelected
                      ? "border-primary/60 bg-secondary"
                      : "border-border bg-muted/10 hover:border-primary/40"
                  }`}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-foreground">{gap.name}</span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      Open
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </span>
                  </span>
                  <span className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {entry?.definition}
                  </span>
                  <span className="mt-1.5 grid gap-0.5 font-mono text-[11px] tabular-nums">
                    <span className="text-accent-cool">
                      {labelA} {gap.scoreA === null ? "—" : gap.scoreA.toFixed(1)} ·{" "}
                      {rankText(standingA.rank, standingA.total)}
                    </span>
                    <span className="text-primary">
                      {labelB} {gap.scoreB === null ? "—" : gap.scoreB.toFixed(1)} ·{" "}
                      {rankText(standingB.rank, standingB.total)}
                    </span>
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
