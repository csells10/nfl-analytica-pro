import { Card, CardContent } from "@/components/ui/card";
import type { LensSnapshot } from "@/lib/matchup-lens-types";

export interface WindowAvailability {
  /** Window identifiers the current source can serve. */
  windows: string[];
  /** Two comparable windows are required for movement. */
  comparable: boolean;
}

/**
 * The source abstraction currently resolves one snapshot for one window, so
 * there is nothing to compare. This inspects what is actually available rather
 * than assuming.
 */
export function windowAvailability(snapshots: LensSnapshot[]): WindowAvailability {
  const windows = Array.from(new Set(snapshots.map((snapshot) => snapshot.windowLabel)));
  return { windows, comparable: windows.length >= 2 };
}

interface MomentumShiftProps {
  snapshots: LensSnapshot[];
}

export function MomentumShift({ snapshots }: MomentumShiftProps) {
  const availability = windowAvailability(snapshots);
  const current = snapshots[0];

  return (
    <Card className="border-border bg-card" data-testid="momentum-shift">
      <CardContent className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Momentum Shift</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Per-lens direction and magnitude of change between two comparable windows.
        </p>

        {availability.comparable ? (
          <p className="mt-4 text-xs text-foreground">
            Two comparable windows are available: {availability.windows.join(" and ")}.
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
              <li>
                Movement needs two comparable windows — for example last 3 games against
                season-to-date — measured on the same metric layer.
              </li>
              <li>
                Preseason coverage of {current?.gamesLabel ?? "2–3 games"} is too thin to separate a
                real shift from normal variation, so no direction is shown.
              </li>
              <li>
                A single snapshot is never re-used as movement, and no time series is generated.
              </li>
            </ul>
            <p className="mt-2 text-[11px] text-muted-foreground/80">
              When a source supplies a second comparable window, this view renders per-lens
              direction and magnitude without any other change to the page.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
