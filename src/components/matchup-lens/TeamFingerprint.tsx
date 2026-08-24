import { Card, CardContent } from "@/components/ui/card";
import { LensRadar, type RadarAxis } from "./LensRadar";
import type { LensGap } from "@/lib/matchup-lens-compare";

interface TeamFingerprintProps {
  axes: { key: string; name: string; scoreA: number | null; scoreB: number | null }[];
  labelA: string;
  labelB: string;
  selectedKey: string;
  onSelect: (key: string) => void;
  selectedGap: LensGap | undefined;
}

/**
 * Two same-scale small multiples. Nothing overlaps, so each team's shape is
 * legible on its own; the gap card below carries the direct comparison.
 */
export function TeamFingerprint({
  axes,
  labelA,
  labelB,
  selectedKey,
  onSelect,
  selectedGap,
}: TeamFingerprintProps) {
  const axesA: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreA }));
  const axesB: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreB }));

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Team Fingerprint</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Same axes · same 0–100 scale
          </span>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-5 md:grid-cols-2">
          <LensRadar axes={axesA} title={labelA} tone="a" selectedKey={selectedKey} onSelect={onSelect} />
          <LensRadar axes={axesB} title={labelB} tone="b" selectedKey={selectedKey} onSelect={onSelect} />
        </div>

        {selectedGap && (
          <div className="mt-4 rounded-md border border-border bg-muted/20 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Selected lens
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">{selectedGap.name}</p>
            <div className="mt-2 flex flex-wrap items-baseline gap-4 font-mono text-sm tabular-nums">
              <span className="text-accent-cool">
                {labelA} {selectedGap.scoreA === null ? "—" : selectedGap.scoreA.toFixed(1)}
              </span>
              <span className="text-primary">
                {labelB} {selectedGap.scoreB === null ? "—" : selectedGap.scoreB.toFixed(1)}
              </span>
              <span className="text-muted-foreground">
                gap {selectedGap.absGap === null ? "—" : selectedGap.absGap.toFixed(1)}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
