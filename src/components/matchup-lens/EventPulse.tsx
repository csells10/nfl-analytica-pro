import { Card, CardContent } from "@/components/ui/card";
import type { EventPulseEntry } from "@/lib/matchup-lens";

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

/**
 * Rare-event rankings, kept out of the primary constellation on purpose.
 * Ties are shown explicitly — many of these metrics are tied league-wide.
 */
export function EventPulse({ entriesA, entriesB, labelA, labelB }: EventPulseProps) {
  const byMetricB = new Map(entriesB.map((entry) => [entry.metric, entry]));

  return (
    <Card className="border-border bg-card">
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Event Pulse</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
            Rare events · excluded from lens scores
          </span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Low-frequency plays. Most teams are tied at the top of these boards after two or three
          preseason games, so ranks are shown with their tie counts rather than as separation.
        </p>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[420px] text-left">
            <thead>
              <tr className="border-b border-border text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                <th className="pb-2 font-medium">Event</th>
                <th className="pb-2 font-medium text-accent-cool">{labelA}</th>
                <th className="pb-2 font-medium text-primary">{labelB}</th>
              </tr>
            </thead>
            <tbody>
              {entriesA.map((entry) => {
                const other = byMetricB.get(entry.metric);
                return (
                  <tr key={entry.metric} className="border-b border-border/60 last:border-0">
                    <td className="py-2 pr-3 text-xs text-foreground">{entry.label}</td>
                    <td className="py-2 pr-3">
                      <span className="block font-mono text-xs tabular-nums text-foreground">
                        {entry.percentile === null ? "—" : entry.percentile.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">{rankText(entry)}</span>
                    </td>
                    <td className="py-2">
                      <span className="block font-mono text-xs tabular-nums text-foreground">
                        {!other || other.percentile === null ? "—" : other.percentile.toFixed(1)}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {other ? rankText(other) : "—"}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
