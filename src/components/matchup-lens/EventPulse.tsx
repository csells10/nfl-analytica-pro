import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { EventPulseEntry } from "@/lib/matchup-lens";
import { eventPulsePairs, type EventPulsePair } from "@/lib/matchup-lens-compare";

interface EventPulseProps {
  entriesA: EventPulseEntry[];
  entriesB: EventPulseEntry[];
  labelA: string;
  labelB: string;
}

function rankText(entry: EventPulseEntry): string {
  if (entry.rank === null) return "—";
  const base = `#${entry.rank}`;
  return entry.tiedWith > 1 ? `${base} (tied, ${entry.tiedWith} teams)` : base;
}

function EventRow({ pair, labelA, labelB }: { pair: EventPulsePair; labelA: string; labelB: string }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="py-2 pr-3 text-xs text-foreground">{pair.label}</td>
      {[
        { entry: pair.a, tone: "text-accent-cool", label: labelA },
        { entry: pair.b, tone: "text-primary", label: labelB },
      ].map(({ entry, tone, label }) => (
        <td key={label} className="py-2 pr-3">
          <span className={`block font-mono text-xs tabular-nums ${tone}`}>
            {entry.percentile === null ? "—" : entry.percentile.toFixed(1)}
          </span>
          <span className="block text-[10px] text-muted-foreground">{rankText(entry)}</span>
        </td>
      ))}
    </tr>
  );
}

/**
 * Rare-event context. Deliberately inert with respect to the lens selection and
 * the presentation switcher — these metrics are excluded from every lens score.
 */
export function EventPulse({ entriesA, entriesB, labelA, labelB }: EventPulseProps) {
  const [showAll, setShowAll] = useState(false);
  const pairs = eventPulsePairs(entriesA, entriesB);
  const differing = pairs.filter((pair) => pair.differs);
  const visible = showAll ? pairs : differing;

  return (
    <Card className="border-border bg-card" data-testid="event-pulse">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Event Pulse</h3>
          <span className="rounded border border-border px-1.5 py-0.5 text-[10px] uppercase tracking-[0.12em] text-muted-foreground">
            Independent rare-event context
          </span>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
          This section does not change when you select a lens because these rare events are excluded
          from all six lens scores.
        </p>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground/80">
          Values are league percentiles and ranks only. A shared 100th-percentile rank means several
          teams sit level on this board — it does not mean either team produced the event.
        </p>

        <p className="mt-3 text-xs text-foreground" data-testid="event-pulse-summary">
          {differing.length === 0
            ? `${labelA} and ${labelB} sit at the same percentile on all ${pairs.length} rare events.`
            : `${differing.length} of ${pairs.length} rare events separate ${labelA} and ${labelB}.`}
        </p>

        {visible.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[340px] text-left">
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  <th className="pb-2 font-medium">Event</th>
                  <th className="pb-2 font-medium text-accent-cool">{labelA}</th>
                  <th className="pb-2 font-medium text-primary">{labelB}</th>
                </tr>
              </thead>
              <tbody data-testid="event-pulse-rows">
                {visible.map((pair) => (
                  <EventRow key={pair.metric} pair={pair} labelA={labelA} labelB={labelB} />
                ))}
              </tbody>
            </table>
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
          className="mt-3 rounded-md border border-border px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
        >
          {showAll ? "Hide tied and unchanged events" : `Show all ${pairs.length} rare events`}
        </button>
      </CardContent>
    </Card>
  );
}
