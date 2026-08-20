import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { WeekSummary } from "@/lib/run-visibility";

interface WeekCardsProps {
  weeks: WeekSummary[];
  selected?: string;
  onSelect: (week?: string) => void;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="space-y-0.5">
      <p className={cn("text-sm font-semibold leading-none", tone ?? "text-foreground")}>{value}</p>
      <p className="text-[11px] leading-tight text-muted-foreground">{label}</p>
    </div>
  );
}

export default function WeekCards({ weeks, selected, onSelect }: WeekCardsProps) {
  const options: Array<{ key?: string; week?: WeekSummary }> = [
    { key: undefined },
    ...weeks.map((week) => ({ key: week.game_week, week })),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {options.map(({ key, week }) => {
        const isActive = selected === key;
        return (
          <Card
            key={key ?? "all"}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            onClick={() => onSelect(key)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(key);
              }
            }}
            className={cn(
              "cursor-pointer border-border bg-card transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              isActive && "border-primary bg-secondary/60",
            )}
          >
            <CardContent className="space-y-3 p-4">
              {week ? (
                <>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{week.label}</p>
                    <p className="text-xs text-muted-foreground">{week.date_label}</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Scheduled" value={week.scheduled} />
                    <Stat label="Captured" value={week.captured} tone="text-primary" />
                    <Stat
                      label="Attention"
                      value={week.needs_attention}
                      tone={week.needs_attention > 0 ? "text-[hsl(var(--destructive))]" : undefined}
                    />
                    <Stat label="Known gaps" value={week.known_gaps} tone="text-[hsl(var(--level-elevated))]" />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <p className="text-sm font-semibold text-foreground">All visible weeks</p>
                    <p className="text-xs text-muted-foreground">Everything in the selected date range</p>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    <Stat label="Scheduled" value={weeks.reduce((n, w) => n + w.scheduled, 0)} />
                    <Stat label="Captured" value={weeks.reduce((n, w) => n + w.captured, 0)} tone="text-primary" />
                    <Stat label="Attention" value={weeks.reduce((n, w) => n + w.needs_attention, 0)} />
                    <Stat
                      label="Known gaps"
                      value={weeks.reduce((n, w) => n + w.known_gaps, 0)}
                      tone="text-[hsl(var(--level-elevated))]"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
