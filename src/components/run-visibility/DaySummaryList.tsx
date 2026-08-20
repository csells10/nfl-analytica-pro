import { CalendarDays, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import StatusChip from "./StatusChip";
import { cn } from "@/lib/utils";
import type { DaySummary } from "@/lib/run-visibility";

interface Props {
  days: DaySummary[];
  selectedDate?: string;
  onSelect: (date?: string) => void;
}

/**
 * Day-first entry point. One calm rollup state per day; game-level detail only
 * appears after a day is selected.
 */
export default function DaySummaryList({ days, selectedDate, onSelect }: Props) {
  if (days.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No scheduled days in this selection.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden />
          Operational days
        </h2>
        <p className="text-xs text-muted-foreground">Select a day to see its games</p>
      </div>

      <div className="space-y-2">
        {days.map((day) => {
          const isSelected = selectedDate === day.game_date;
          return (
            <Card
              key={day.game_date}
              role="button"
              tabIndex={0}
              aria-pressed={isSelected}
              aria-label={`${day.label}. ${day.summary}`}
              onClick={() => onSelect(isSelected ? undefined : day.game_date)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSelect(isSelected ? undefined : day.game_date);
                }
              }}
              className={cn(
                "cursor-pointer border-border bg-card transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                isSelected && "border-primary bg-secondary/50",
              )}
            >
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{day.label}</p>
                  <p className="text-xs text-muted-foreground">{day.summary}</p>
                  <p className="text-[11px] text-muted-foreground">{day.week_label}</p>
                </div>
                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <StatusChip {...day.overall} quiet />
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      isSelected && "rotate-180",
                    )}
                    aria-hidden
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
