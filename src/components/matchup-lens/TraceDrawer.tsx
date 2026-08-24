import { Suspense, lazy, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Trace, TraceTarget, TracedMetric, TeamMetricReading } from "@/lib/matchup-lens-trace";
import type { LensSnapshot } from "@/lib/matchup-lens-types";
import { rankText } from "@/lib/matchup-lens-language";
import { RoleBadge, TagChip } from "./TraceChips";

const TraceGraphs = lazy(() => import("./TraceGraphs"));

type TraceVisual = "list" | "network" | "packed";

interface TraceDrawerProps {
  trace: Trace | null;
  target: TraceTarget | null;
  snapshot: LensSnapshot | undefined;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTrace: (target: TraceTarget) => void;
  onSelectLens: (lensKey: string) => void;
  selectedLensName: string;
  matchupLabel: string;
}

function Readings({ readings }: { readings: TeamMetricReading[] }) {
  return (
    <ul className="mt-1.5 space-y-1">
      {readings.map((reading, index) => (
        <li
          key={reading.teamAbv}
          className={`flex flex-wrap items-baseline justify-between gap-2 text-[11px] ${
            index === 0 ? "text-accent-cool" : "text-primary"
          }`}
        >
          <span className="font-semibold">{reading.teamAbv}</span>
          <span className="font-mono text-muted-foreground">
            {reading.readable} · {rankText(reading.standing.rank, reading.standing.total)}
          </span>
        </li>
      ))}
    </ul>
  );
}

function MetricRow({
  metric,
  onOpenTrace,
}: {
  metric: TracedMetric;
  onOpenTrace: (target: TraceTarget) => void;
}) {
  return (
    <li className="rounded-md border border-border bg-muted/10 p-2.5">
      <button
        type="button"
        data-metric={metric.metric}
        onClick={() => onOpenTrace({ type: "metric", id: metric.metric })}
        className="w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <span className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-foreground">{metric.label}</span>
          <span className="flex flex-wrap items-center gap-1">
            <RoleBadge label={metric.roleLabel} />
            <RoleBadge
              muted
              label={metric.includedInSelectedLens ? "Included in this lens" : "Not in this lens"}
            />
          </span>
        </span>
        {metric.exclusionReason && (
          <span className="mt-1 block text-[11px] text-muted-foreground">
            {metric.exclusionReason}
          </span>
        )}
        {metric.influence.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {metric.influence.map((note) => (
              <RoleBadge key={note} label={note} muted />
            ))}
          </span>
        )}
        <Readings readings={metric.readings} />
      </button>
    </li>
  );
}

function VisualSwitch({
  value,
  onChange,
}: {
  value: TraceVisual;
  onChange: (value: TraceVisual) => void;
}) {
  const options: { value: TraceVisual; label: string }[] = [
    { value: "list", label: "List" },
    { value: "network", label: "Network" },
    { value: "packed", label: "Packed groups" },
  ];
  return (
    <div
      role="group"
      aria-label="Trace view"
      className="mt-3 flex gap-1 rounded-md border border-border p-0.5"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          data-visual={option.value}
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={`flex-1 rounded px-2 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            value === option.value
              ? "bg-secondary text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Shared reverse-trace surface. It answers which lens an item belongs to, which
 * signals connect it, which metrics support it, and where it lands in the
 * current matchup. The relationship graph and circle packing live here only —
 * never on the dashboard.
 */
export function TraceDrawer({
  trace,
  target,
  snapshot,
  open,
  onOpenChange,
  onOpenTrace,
  onSelectLens,
  selectedLensName,
  matchupLabel,
}: TraceDrawerProps) {
  const [visual, setVisual] = useState<TraceVisual>("list");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full overflow-y-auto sm:max-w-md"
        data-testid="trace-drawer"
      >
        {trace === null ? (
          <SheetHeader>
            <SheetTitle>Nothing to trace</SheetTitle>
          </SheetHeader>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="text-base">{trace.label}</SheetTitle>
            </SheetHeader>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {trace.type === "tag"
                ? `Signal · connects lenses and metrics · checked against ${selectedLensName}`
                : `Metric · feeds signals and lenses · checked against ${selectedLensName}`}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              In this matchup: {matchupLabel}
            </p>

            <VisualSwitch value={visual} onChange={setVisual} />

            {visual !== "list" && snapshot && target && (
              <div className="mt-3">
                <Suspense
                  fallback={<p className="text-[11px] text-muted-foreground">Loading view…</p>}
                >
                  <TraceGraphs
                    snapshot={snapshot}
                    target={target}
                    mode={visual}
                    onOpenTrace={onOpenTrace}
                    onSelectLens={onSelectLens}
                  />
                </Suspense>
              </div>
            )}

            {trace.type === "tag" ? (
              <div data-testid="tag-trace" data-trace-id={trace.tag}>
                <section className="mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Parent lenses ({trace.lenses.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1.5" data-testid="tag-trace-lenses">
                    {trace.lenses.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        No lens currently uses this signal.
                      </p>
                    )}
                    {trace.lenses.map((lens) => (
                      <button
                        key={lens.key}
                        type="button"
                        data-lens-key={lens.key}
                        onClick={() => onSelectLens(lens.key)}
                        className="min-h-[32px] rounded border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {lens.name}
                        {lens.excluded && (
                          <span className="ml-1 text-muted-foreground">(excluded)</span>
                        )}
                      </button>
                    ))}
                  </div>
                </section>

                <section className="mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Supporting metrics ({trace.metrics.length})
                  </h4>
                  <ul className="mt-2 space-y-2" data-testid="tag-trace-metrics">
                    {trace.metrics.map((metric) => (
                      <MetricRow key={metric.metric} metric={metric} onOpenTrace={onOpenTrace} />
                    ))}
                  </ul>
                </section>
              </div>
            ) : (
              <div data-testid="metric-trace" data-trace-id={trace.metric}>
                <div className="mt-3 flex flex-wrap gap-1">
                  <RoleBadge label={trace.roleLabel} />
                  {trace.influence.map((note) => (
                    <RoleBadge key={note} label={note} muted />
                  ))}
                </div>

                <section className="mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Where it lands in this matchup
                  </h4>
                  <Readings readings={trace.readings} />
                </section>

                <section className="mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Connecting signals ({trace.tags.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1.5" data-testid="metric-trace-tags">
                    {trace.tags.map((tag) => (
                      <TagChip key={tag} tag={tag} onOpenTrace={onOpenTrace} />
                    ))}
                  </div>
                </section>

                <section className="mt-4">
                  <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    Parent lenses ({trace.lenses.length})
                  </h4>
                  <div className="mt-2 flex flex-wrap gap-1.5" data-testid="metric-trace-lenses">
                    {trace.lenses.length === 0 && (
                      <p className="text-[11px] text-muted-foreground">
                        This metric does not feed any of the six lenses.
                      </p>
                    )}
                    {trace.lenses.map((lens) => (
                      <button
                        key={lens.key}
                        type="button"
                        data-lens-key={lens.key}
                        onClick={() => onSelectLens(lens.key)}
                        className="min-h-[32px] rounded border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:border-foreground/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        {lens.name}
                      </button>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
