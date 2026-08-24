import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { Trace, TraceTarget, TracedMetric, TeamMetricReading } from "@/lib/matchup-lens-trace";
import { rankText } from "@/lib/matchup-lens-language";
import { RoleBadge, TagChip } from "./TraceChips";

interface TraceDrawerProps {
  trace: Trace | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onOpenTrace: (target: TraceTarget) => void;
  onSelectLens: (lensKey: string) => void;
  selectedLensName: string;
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
          <span className="text-muted-foreground">
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
        className="w-full text-left"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-foreground">{metric.label}</span>
          <span className="flex flex-wrap items-center gap-1">
            <RoleBadge label={metric.roleLabel} />
            <RoleBadge
              muted
              label={metric.includedInSelectedLens ? "Included in this lens" : "Not in this lens"}
            />
          </span>
        </div>
        {metric.exclusionReason && (
          <p className="mt-1 text-[11px] text-muted-foreground">{metric.exclusionReason}</p>
        )}
        {metric.influence.length > 0 && (
          <p className="mt-1 flex flex-wrap gap-1">
            {metric.influence.map((note) => (
              <RoleBadge key={note} label={note} muted />
            ))}
          </p>
        )}
        <Readings readings={metric.readings} />
      </button>
    </li>
  );
}

/**
 * Shared reverse-trace surface. Every experience opens the same drawer, so the
 * matchup context is never lost and the graph can be walked in both directions.
 */
export function TraceDrawer({
  trace,
  open,
  onOpenChange,
  onOpenTrace,
  onSelectLens,
  selectedLensName,
}: TraceDrawerProps) {
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
        ) : trace.type === "tag" ? (
          <div data-testid="tag-trace" data-trace-id={trace.tag}>
            <SheetHeader>
              <SheetTitle className="text-base">{trace.label}</SheetTitle>
            </SheetHeader>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{trace.tag}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              Path: Lens ← Tag → Metrics · eligibility shown against {selectedLensName}
            </p>

            <section className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Lenses that use this tag ({trace.lenses.length})
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5" data-testid="tag-trace-lenses">
                {trace.lenses.length === 0 && (
                  <p className="text-[11px] text-muted-foreground">
                    No lens currently consumes this tag.
                  </p>
                )}
                {trace.lenses.map((lens) => (
                  <button
                    key={lens.key}
                    type="button"
                    data-lens-key={lens.key}
                    onClick={() => onSelectLens(lens.key)}
                    className="rounded border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:border-foreground/40"
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
                Metrics carrying this tag ({trace.metrics.length})
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
            <SheetHeader>
              <SheetTitle className="text-base">{trace.label}</SheetTitle>
            </SheetHeader>
            <p className="mt-1 font-mono text-[11px] text-muted-foreground">{trace.metric}</p>
            <p className="mt-2 text-[11px] text-muted-foreground">Path: Metric → Tags → Lenses</p>

            <div className="mt-3 flex flex-wrap gap-1">
              <RoleBadge label={trace.roleLabel} />
              {trace.influence.map((note) => (
                <RoleBadge key={note} label={note} muted />
              ))}
            </div>

            <section className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                League-relative standing
              </h4>
              <Readings readings={trace.readings} />
            </section>

            <section className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Lens tags ({trace.tags.length})
              </h4>
              <div className="mt-2 flex flex-wrap gap-1.5" data-testid="metric-trace-tags">
                {trace.tags.map((tag) => (
                  <TagChip key={tag} tag={tag} onOpenTrace={onOpenTrace} />
                ))}
              </div>
            </section>

            <section className="mt-4">
              <h4 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Lenses it can contribute to ({trace.lenses.length})
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
                    className="rounded border border-border bg-secondary px-2 py-1 text-[11px] font-medium text-secondary-foreground transition-colors hover:border-foreground/40"
                  >
                    {lens.name}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
