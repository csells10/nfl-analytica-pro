import { useState } from "react";
import { AlertTriangle, CheckCircle2, ChevronDown, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import type { AttentionItem, DaySummary } from "@/lib/run-visibility";

interface Props {
  days: DaySummary[];
  needsAttention: AttentionItem[];
  knownGaps: AttentionItem[];
  onSelectDay: (date?: string) => void;
  onShowAttentionDays: () => void;
}

/**
 * Compact replacement for the old global issue lists: a single line for active
 * attention and a collapsed, day-navigable known-gap ledger.
 */
export default function AttentionSummary({
  days,
  needsAttention,
  knownGaps,
  onSelectDay,
  onShowAttentionDays,
}: Props) {
  const [gapsOpen, setGapsOpen] = useState(false);
  const gapDays = days.filter((day) => day.known_gaps > 0);

  return (
    <div className="space-y-2">
      {needsAttention.length > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="flex items-center gap-2 text-sm text-foreground">
              <AlertTriangle className="h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden />
              {needsAttention.length} condition{needsAttention.length === 1 ? "" : "s"} need attention across{" "}
              {days.filter((d) => d.needs_attention > 0).length} day
              {days.filter((d) => d.needs_attention > 0).length === 1 ? "" : "s"}.
            </p>
            <Button variant="outline" size="sm" onClick={onShowAttentionDays}>
              Show affected days
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-border bg-card">
          <CardContent className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            Nothing needs attention in this selection.
          </CardContent>
        </Card>
      )}

      <Card className="border-border bg-card">
        <Collapsible open={gapsOpen} onOpenChange={setGapsOpen}>
          <CollapsibleTrigger className="flex w-full items-start gap-3 p-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <History className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--level-elevated))]" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">
                Known gaps <span className="text-muted-foreground">({knownGaps.length})</span>
              </p>
              <p className="text-xs text-muted-foreground">
                Permanent historical evidence kept for QA and audit. No ongoing response required.
              </p>
            </div>
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", gapsOpen && "rotate-180")}
              aria-hidden
            />
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="space-y-1.5 p-3 pt-0">
              {gapDays.length === 0 ? (
                <p className="text-xs text-muted-foreground">No historical gaps recorded in this selection.</p>
              ) : (
                gapDays.map((day) => (
                  <button
                    key={day.game_date}
                    type="button"
                    onClick={() => onSelectDay(day.game_date)}
                    className="flex w-full items-center justify-between gap-3 rounded-md border border-border bg-background/40 px-3 py-2 text-left transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <span className="text-sm text-foreground">{day.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {day.known_gaps} known gap{day.known_gaps === 1 ? "" : "s"}
                    </span>
                  </button>
                ))
              )}
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>
    </div>
  );
}
