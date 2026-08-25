import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GameBrief as GameBriefData } from "@/lib/matchup-lens-brief";
import { InfoTip } from "./InfoTip";

interface GameBriefProps {
  brief: GameBriefData;
  onSelectLens: (lensKey: string) => void;
  onOpenCollision: (collisionKey: string) => void;
}

/**
 * "Start here": at most three supported observations, plain meaning first and
 * the lens label second. Each row is an explicit route into a focused view.
 */
export function GameBrief({ brief, onSelectLens, onOpenCollision }: GameBriefProps) {
  return (
    <Card className="border-border bg-card" data-testid="game-brief">
      <CardContent className="p-3 sm:p-4">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">
          Start here — what to notice
        </h2>

        <ul className="mt-2 space-y-1.5" data-testid="brief-observations">
          {brief.observations.map((observation) => (
            <li key={observation.id}>
              <div
                className="group flex items-start gap-2 rounded-md border border-border bg-muted/10 p-2 transition-colors hover:border-primary/50 hover:bg-secondary focus-within:border-primary/50"
                data-observation-row={observation.id}
              >
                <button
                  type="button"
                  data-observation={observation.id}
                  data-lens-key={observation.lensKey ?? ""}
                  data-collision-key={observation.collisionKey ?? ""}
                  onClick={() => {
                    if (observation.collisionKey) onOpenCollision(observation.collisionKey);
                    else if (observation.lensKey) onSelectLens(observation.lensKey);
                  }}
                  className="min-h-[44px] min-w-0 flex-1 cursor-pointer rounded text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0"
                >
                  <span className="block text-xs leading-relaxed text-foreground">
                    {observation.text}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-1.5">
                    <span className="rounded border border-border bg-card px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
                      {observation.badge}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                      Explore
                      <ArrowRight className="h-3 w-3" aria-hidden="true" />
                    </span>
                  </span>
                </button>
                <InfoTip label={observation.badge} align="right">
                  {observation.definition}
                </InfoTip>
              </div>
            </li>
          ))}
        </ul>

        <details className="mt-2 rounded-md border border-border bg-muted/10 p-2">
          <summary className="cursor-pointer text-[11px] font-semibold text-muted-foreground">
            Data readiness &amp; method
          </summary>
          <p className="mt-1.5 font-mono text-[11px] text-muted-foreground" data-testid="brief-status">
            {brief.statusLine}
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            {brief.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </details>
      </CardContent>
    </Card>
  );
}
