import type { LensGap } from "@/lib/matchup-lens-compare";
import { PROFILE_ANGLE_DISCLAIMER, type ProfileAngle } from "@/lib/matchup-lens-angle";

interface InsightCardsProps {
  largest: LensGap | null;
  closest: LensGap | null;
  angle: ProfileAngle | null;
  labelA: string;
  labelB: string;
  onSelectLens: (lensKey: string) => void;
  onOpenCollision: (collisionKey: string) => void;
}

function leaderLabel(gap: LensGap, labelA: string, labelB: string): string {
  if (gap.leader === "a") return `${labelA} ahead`;
  if (gap.leader === "b") return `${labelB} ahead`;
  return "Even";
}

function CardShell({
  title,
  headline,
  detail,
  note,
  testId,
  lensKey,
  onClick,
}: {
  title: string;
  headline: string;
  detail: string;
  note?: string;
  testId: string;
  lensKey?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      data-lens-key={lensKey ?? ""}
      onClick={onClick}
      className="min-h-[92px] w-[260px] shrink-0 snap-start rounded-lg border border-border bg-card p-3 text-left transition-colors hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:w-auto"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-sm font-semibold leading-snug text-foreground">{headline}</p>
      <p className="mt-1 font-mono text-[11px] leading-snug text-muted-foreground">{detail}</p>
      {note && <p className="mt-1 text-[10px] italic text-muted-foreground/80">{note}</p>}
    </button>
  );
}

/**
 * The three answers the dashboard owes the user before any interaction:
 * the widest difference, the closest battleground and one supported angle.
 */
export function InsightCards({
  largest,
  closest,
  angle,
  labelA,
  labelB,
  onSelectLens,
  onOpenCollision,
}: InsightCardsProps) {
  return (
    <div
      data-testid="insight-cards"
      className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {largest && (
        <CardShell
          testId="insight-largest"
          title="Largest separation"
          headline={largest.name}
          detail={`${(largest.absGap ?? 0).toFixed(1)} points apart · ${leaderLabel(largest, labelA, labelB)}`}
          lensKey={largest.key}
          onClick={() => onSelectLens(largest.key)}
        />
      )}
      {closest && (
        <CardShell
          testId="insight-closest"
          title="Closest lens"
          headline={closest.name}
          detail={`${(closest.absGap ?? 0).toFixed(1)} points apart · ${leaderLabel(closest, labelA, labelB)}`}
          lensKey={closest.key}
          onClick={() => onSelectLens(closest.key)}
        />
      )}
      {angle && (
        <CardShell
          testId="insight-angle"
          title={angle.title}
          headline={angle.sentence}
          detail={angle.support}
          note={PROFILE_ANGLE_DISCLAIMER}
          lensKey={angle.lensKey}
          onClick={() => {
            if (angle.collisionKey) onOpenCollision(angle.collisionKey);
            else if (angle.lensKey) onSelectLens(angle.lensKey);
          }}
        />
      )}
    </div>
  );
}
