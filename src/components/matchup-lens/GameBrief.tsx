import { Card, CardContent } from "@/components/ui/card";
import type { GameBrief as GameBriefData } from "@/lib/matchup-lens-brief";
import { scoreText } from "@/lib/matchup-lens-language";

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
 * The human entry point: what is different, where it is closest, and what the
 * data can and cannot say. Every line is a calculation, never a forecast.
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
  const headline = [
    { title: "Biggest profile difference", gap: brief.largest },
    { title: "Closest battleground", gap: brief.closest },
  ];

  return (
    <Card className="border-border bg-card" data-testid="game-brief">
      <CardContent className="p-4 sm:p-5">
        <h2 className="text-sm font-semibold tracking-tight text-foreground">Game Brief</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          <span className="text-accent-cool">{nameA}</span> ({labelA}) versus{" "}
          <span className="text-primary">{nameB}</span> ({labelB}) — where they are strongest,
          where their profiles collide, and what the snapshot can support.
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {headline.map((card) =>
            card.gap ? (
              <button
                key={card.title}
                type="button"
                data-lens-key={card.gap.key}
                onClick={() => onSelectLens(card.gap!.key)}
                className="rounded-md border border-border bg-muted/20 p-3 text-left transition-colors hover:border-foreground/30"
              >
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {card.title}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">{card.gap.name}</p>
                <p className="mt-1 text-[11px] text-accent-cool">
                  {labelA} {scoreText(card.gap.scoreA)}
                </p>
                <p className="text-[11px] text-primary">
                  {labelB} {scoreText(card.gap.scoreB)}
                </p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {(card.gap.absGap ?? 0).toFixed(1)} points apart
                </p>
              </button>
            ) : null,
          )}
        </div>

        <div className="mt-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Matchup observations
          </p>
          <ul className="mt-2 space-y-1.5" data-testid="brief-observations">
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
                  className="w-full rounded-md border border-transparent px-2.5 py-2 text-left text-xs leading-relaxed text-foreground transition-colors hover:border-border hover:bg-muted/30"
                >
                  {observation.text}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-4 rounded-md border border-border bg-muted/10 p-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Data readiness
          </p>
          <ul className="mt-1.5 space-y-1 text-[11px] leading-relaxed text-muted-foreground">
            {brief.caveats.map((caveat) => (
              <li key={caveat}>{caveat}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
