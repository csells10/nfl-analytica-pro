import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StatusChip from "./StatusChip";
import { cn } from "@/lib/utils";
import type { ClockEvidence, StageEvidence } from "@/lib/run-visibility";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-x-2">
      <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</span>
      <span className="text-xs text-foreground">{value}</span>
    </div>
  );
}

function RawEvidence({ stage }: { stage: StageEvidence }) {
  const [open, setOpen] = useState(false);
  if (!stage.raw) return null;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        Raw evidence
        <ChevronDown className={cn("h-3 w-3 transition-transform", open && "rotate-180")} />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <dl className="mt-2 grid grid-cols-1 gap-1 rounded-md border border-border bg-muted/40 p-2 sm:grid-cols-2">
          {Object.entries(stage.raw).map(([key, value]) => (
            <div key={key} className="flex gap-2 font-mono text-[11px]">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="break-all text-foreground">{String(value)}</dd>
            </div>
          ))}
        </dl>
      </CollapsibleContent>
    </Collapsible>
  );
}

function StageItem({ stage, isLast }: { stage: StageEvidence; isLast: boolean }) {
  const [open, setOpen] = useState(false);

  return (
    <li className="relative pl-6">
      {!isLast && <span className="absolute left-[7px] top-5 h-full w-px bg-border" aria-hidden />}
      <span className="absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-border bg-card" aria-hidden />
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-center gap-2 rounded-md py-1 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <span className="flex-1 text-sm font-medium text-foreground">{stage.name}</span>
          <StatusChip status={stage.status} attention={stage.attention} />
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="space-y-2 pb-3 pt-1">
            {stage.reason && <p className="text-xs text-muted-foreground">{stage.reason}</p>}
            {stage.note && (
              <p className="rounded-md border border-border bg-muted/40 p-2 text-xs text-muted-foreground">{stage.note}</p>
            )}
            <div className="space-y-1">
              {typeof stage.count === "number" && <DetailRow label="Count" value={String(stage.count)} />}
              {stage.canonical_source && <DetailRow label="Canonical source" value={stage.canonical_source} />}
              {stage.timestamp && <DetailRow label="Timestamp" value={stage.timestamp} />}
              {typeof stage.retryable === "boolean" && (
                <DetailRow label="Retryable" value={stage.retryable ? "Yes — safe to re-run" : "No — window has closed"} />
              )}
            </div>
            <RawEvidence stage={stage} />
          </div>
        </CollapsibleContent>
      </Collapsible>
    </li>
  );
}

export default function StageTimeline({ clock }: { clock: ClockEvidence }) {
  return (
    <section className="rounded-lg border border-border bg-background/40 p-4">
      <header className="mb-3 space-y-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-foreground">{clock.name}</h3>
          <StatusChip status={clock.status} attention={clock.attention} mixed={clock.mixed} />
        </div>
        <p className="text-xs text-muted-foreground">{clock.description}</p>
      </header>
      <ol className="space-y-1">
        {clock.stages.map((stage, index) => (
          <StageItem key={stage.key} stage={stage} isLast={index === clock.stages.length - 1} />
        ))}
      </ol>
    </section>
  );
}
