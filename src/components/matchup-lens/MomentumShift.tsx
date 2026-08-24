import { Card, CardContent } from "@/components/ui/card";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import { momentumReadiness } from "@/lib/matchup-lens-momentum";

interface MomentumShiftProps {
  snapshots: LensSnapshot[];
}

/**
 * Movement between comparable windows. The source currently resolves a single
 * window, so nothing is drawn: no line, no dots, no re-used snapshot.
 */
export function MomentumShift({ snapshots }: MomentumShiftProps) {
  const readiness = momentumReadiness(snapshots);
  const current = snapshots[0];

  return (
    <Card className="border-border bg-card" data-testid="momentum-shift">
      <CardContent className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Momentum</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Per-lens direction between comparable windows — strengthening, stable or weakening.
        </p>

        {readiness.eligible ? (
          <p className="mt-4 text-xs text-foreground" data-granularity={readiness.granularity}>
            {readiness.periods} comparable windows available: {readiness.windows.join(", ")}.
          </p>
        ) : (
          <div
            className="mt-4 rounded-md border border-dashed border-border bg-muted/10 p-4"
            data-testid="momentum-unavailable"
          >
            <p className="text-xs font-semibold text-foreground">
              Movement is not available for this window yet.
            </p>
            <ul className="mt-2 space-y-1.5 text-[11px] leading-relaxed text-muted-foreground">
              <li>
                The current source serves one window only:{" "}
                <span className="text-foreground">{current?.windowLabel ?? "unknown"}</span> as of{" "}
                {current?.asOfDate ?? "unknown"}.
              </li>
              <li>{readiness.note}</li>
              <li>
                Preseason coverage of {current?.gamesLabel ?? "2–3 games"} is too thin to separate a
                real shift from normal variation.
              </li>
              <li>A single snapshot is never re-used as movement, and no time series is drawn.</li>
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
