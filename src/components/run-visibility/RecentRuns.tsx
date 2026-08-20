import { useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StatusChip from "./StatusChip";
import { cn } from "@/lib/utils";
import type { RunAttempt } from "@/lib/run-visibility";

function Field({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-all font-mono text-xs text-foreground">{value}</p>
    </div>
  );
}

function RunRow({ run }: { run: RunAttempt }) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full items-start gap-3 rounded-md border border-border bg-background/40 p-3 text-left transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{run.label}</p>
          <p className="text-xs text-muted-foreground">
            {run.games_completed} of {run.games_in_scope} games completed
          </p>
          {run.reason && <p className="text-xs text-muted-foreground">{run.reason}</p>}
        </div>
        <StatusChip status={run.status} attention={run.attention} className="shrink-0" />
        <ChevronDown className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 grid grid-cols-2 gap-3 rounded-md border border-border bg-muted/40 p-3 sm:grid-cols-3">
          <Field label="Attempt ID" value={run.attempt_id} />
          <Field label="Stage" value={run.stage} />
          <Field label="Source receipt table" value={run.source_receipt_table} />
          <Field label="Started" value={run.started_at} />
          <Field label="Finished" value={run.finished_at} />
          <Field label="Duration" value={`${run.duration_seconds}s`} />
          <Field label="Input count" value={run.input_count} />
          <Field label="Output count" value={run.output_count} />
          <Field label="Raw reason" value={run.raw_reason ?? "—"} />
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface RecentRunsProps {
  runs: RunAttempt[];
  /** When a day is selected, only attempts that covered that day are listed. */
  selectedDate?: string;
  selectedDayLabel?: string;
}

export default function RecentRuns({ runs, selectedDate, selectedDayLabel }: RecentRunsProps) {
  const [open, setOpen] = useState(false);
  const visibleRuns = selectedDate ? runs.filter((run) => run.related_dates.includes(selectedDate)) : runs;

  return (
    <Card className="border-border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Play className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              Recent Runs <span className="text-muted-foreground">({visibleRuns.length})</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {selectedDate
                ? `Attempts that covered ${selectedDayLabel ?? selectedDate}. An attempt is one bounded coordinator invocation, not a game.`
                : "An attempt is one bounded coordinator invocation. It may cover one game or many, and is not the same as a game ID."}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 p-4 pt-0">
            {visibleRuns.length === 0 ? (
              <p className="text-xs text-muted-foreground">No attempts recorded for this day.</p>
            ) : (
              visibleRuns.map((run) => <RunRow key={run.attempt_id} run={run} />)
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
