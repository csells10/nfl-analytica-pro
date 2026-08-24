import { Card, CardContent } from "@/components/ui/card";
import { LensRadar, type RadarAxis } from "./LensRadar";
import type { LensGap } from "@/lib/matchup-lens-compare";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import { lensStanding } from "@/lib/matchup-lens-rank";
import { rankText, scoreText } from "@/lib/matchup-lens-language";

interface TeamFingerprintProps {
  axes: { key: string; name: string; scoreA: number | null; scoreB: number | null }[];
  snapshot: LensSnapshot;
  teamAbvA: string;
  teamAbvB: string;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  selectedKey: string;
  onSelect: (key: string) => void;
  selectedGap: LensGap | undefined;
}

/**
 * Two same-scale small multiples. Nothing overlaps, so each team's shape is
 * legible on its own; the card below carries the direct comparison.
 */
export function TeamFingerprint({
  axes,
  snapshot,
  teamAbvA,
  teamAbvB,
  labelA,
  labelB,
  nameA,
  nameB,
  selectedKey,
  onSelect,
  selectedGap,
}: TeamFingerprintProps) {
  const axesA: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreA }));
  const axesB: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreB }));
  const standingA = selectedGap ? lensStanding(snapshot, selectedGap.key, teamAbvA) : null;
  const standingB = selectedGap ? lensStanding(snapshot, selectedGap.key, teamAbvB) : null;

  return (
    <Card className="border-border bg-card" data-testid="team-fingerprint">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">Team Fingerprint</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Identical axes and one fixed 0–100 Lens Score scale, so the two shapes are directly
              comparable without overlapping.
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="min-w-0">
            <p className="mb-1 text-center text-[11px] text-muted-foreground">{nameA}</p>
            <LensRadar axes={axesA} title={labelA} tone="a" selectedKey={selectedKey} onSelect={onSelect} />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-center text-[11px] text-muted-foreground">{nameB}</p>
            <LensRadar axes={axesB} title={labelB} tone="b" selectedKey={selectedKey} onSelect={onSelect} />
          </div>
        </div>

        {selectedGap && (
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Selected lens
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedGap.name}</p>
            <div className="mt-2 grid gap-1 text-xs tabular-nums sm:grid-cols-2">
              <span className="text-accent-cool">
                {labelA} {scoreText(selectedGap.scoreA)}
                {standingA && ` · ${rankText(standingA.rank, standingA.total)} · ${standingA.tier}`}
              </span>
              <span className="text-primary">
                {labelB} {scoreText(selectedGap.scoreB)}
                {standingB && ` · ${rankText(standingB.rank, standingB.total)} · ${standingB.tier}`}
              </span>
            </div>
            <p className="mt-1.5 text-[11px] text-muted-foreground">
              {selectedGap.absGap === null
                ? "No gap available for this lens."
                : `${selectedGap.absGap.toFixed(1)} points apart · ${
                    selectedGap.leader === "a"
                      ? `${labelA} ahead`
                      : selectedGap.leader === "b"
                        ? `${labelB} ahead`
                        : "even"
                  }`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
