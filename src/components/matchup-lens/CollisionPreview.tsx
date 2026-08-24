import { Card, CardContent } from "@/components/ui/card";
import type { CollisionDirection } from "@/lib/matchup-lens-collision";
import { collisionHighlights } from "@/lib/matchup-lens-collision";
import { scoreText } from "@/lib/matchup-lens-language";

interface CollisionPreviewProps {
  directions: CollisionDirection[];
  onOpen: (collisionKey: string | null) => void;
}

/**
 * Dashboard preview for Matchup Collision: one plain sentence about a supported
 * offence-versus-defence interaction, with the detailed view one click away.
 */
export function CollisionPreview({ directions, onOpen }: CollisionPreviewProps) {
  const { strongest } = collisionHighlights(directions);

  return (
    <Card className="border-border bg-card" data-testid="collision-preview">
      <CardContent className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">
          Where profiles collide
        </h3>

        {strongest ? (
          <>
            <p className="mt-1.5 text-xs leading-relaxed text-foreground">
              With {strongest.direction.offenseAbv} holding the ball, their{" "}
              {strongest.lane.offense.label.toLowerCase()} profile meets{" "}
              {strongest.direction.defenseAbv}&rsquo;s {strongest.lane.defense.label.toLowerCase()}{" "}
              profile.
            </p>
            <p className="mt-1.5 grid gap-0.5 font-mono text-[11px] tabular-nums">
              <span className="text-accent-cool">
                {strongest.direction.offenseAbv} {strongest.lane.offense.label}{" "}
                {scoreText(strongest.lane.offense.score)}
              </span>
              <span className="text-primary">
                {strongest.direction.defenseAbv} {strongest.lane.defense.label}{" "}
                {scoreText(strongest.lane.defense.score)}
              </span>
            </p>
            <p className="mt-1 text-[11px] italic text-muted-foreground/80">
              Profile matchup, not a forecast.
            </p>
            <button
              type="button"
              data-collision-key={strongest.lane.key}
              onClick={() => onOpen(strongest.lane.key)}
              className="mt-3 min-h-[44px] rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open collision detail
            </button>
          </>
        ) : (
          <>
            <p className="mt-1.5 text-xs text-muted-foreground" data-testid="collision-unsupported">
              No supported collision identified — the current snapshot does not carry a counterpart
              metric for both sides of any interaction.
            </p>
            <button
              type="button"
              onClick={() => onOpen(null)}
              className="mt-3 min-h-[44px] rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Open collision detail
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
