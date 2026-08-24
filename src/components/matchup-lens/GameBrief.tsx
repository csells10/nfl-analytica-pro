import { Card, CardContent } from "@/components/ui/card";
import type { GameBrief as GameBriefData } from "@/lib/matchup-lens-brief";

interface GameBriefProps {
  brief: GameBriefData;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  onSelectLens: (lensKey: string) => void;
  onOpenCollision: (collisionKey: string) => void;
}

/**
 * The human entry point: the two or three strongest supported statements about
 * this matchup. Separation and closest-lens live in the headline cards, so they
 * are not repeated here.
 */
export function GameBrief({
  brief,
  labelA,
  labelB,
  nameA,
  nameB,
  onSelectLens,
  onOpenCollision,
}: GameBriefProps) {
  return (
    <Card className="border-border bg-card" data-testid="game-brief">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Game Brief</h2>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          <span className="text-accent-cool">{nameA}</span> ({labelA}) versus{" "}
          <span className="text-primary">{nameB}</span> ({labelB}) — where each team is strongest and
          where their profiles collide.
        </p>
        <p className="mt-1.5 font-mono text-[11px] text-muted-foreground" data-testid="brief-status">
          {brief.statusLine}
        </p>

        <ul className="mt-3 space-y-1.5" data-testid="brief-observations">
          {brief.observations.map((observation) => (
            <li key={observation.id}>
              <button
                type="button"
                data-observation={observation.id}
                data-lens-key={observation.lensKey ?? ""}
                data-collision-key={observation.collisionKey ?? ""}
                onClick={() => {
                  if (observation.collisionKey) onOpenCollision(observation.collisionKey);
                  else if (observation.lensKey) onSelectLens(observation.lensKey);
                }}
                className="min-h-[44px] w-full rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:border-border hover:bg-muted/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="block text-xs leading-relaxed text-foreground">
                  {observation.text}
                </span>
                <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                  {observation.detail}
                </span>
              </button>
            </li>
          ))}
        </ul>

        <details className="mt-3 rounded-md border border-border bg-muted/10 p-2.5">
          <summary className="cursor-pointer text-[11px] font-semibold text-foreground">
            Data readiness &amp; method
          </summary>
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
