import { useState } from "react";
import { AlertTriangle, ChevronDown, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import StatusChip from "./StatusChip";
import { cn } from "@/lib/utils";
import type { AttentionItem } from "@/lib/run-visibility";

interface SectionProps {
  title: string;
  description: string;
  icon: typeof AlertTriangle;
  tone: string;
  items: AttentionItem[];
  defaultOpen: boolean;
  emptyLabel: string;
  onOpenGame: (gameId: string) => void;
}

function Section({ title, description, icon: Icon, tone, items, defaultOpen, emptyLabel, onOpenGame }: SectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Card className="border-border bg-card">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex w-full items-start gap-3 p-4 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", tone)} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">
              {title} <span className="text-muted-foreground">({items.length})</span>
            </p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-2 p-4 pt-0">
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">{emptyLabel}</p>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpenGame(item.game_id)}
                  className="flex w-full flex-col gap-1 rounded-md border border-border bg-background/40 p-3 text-left transition-colors hover:border-primary/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.matchup} <span className="font-normal text-muted-foreground">· {item.week_label}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {item.clock} · {item.stage}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.reason}</p>
                  </div>
                  <StatusChip status={item.status} attention={item.attention} className="shrink-0 self-start" />
                </button>
              ))
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

interface Props {
  needsAttention: AttentionItem[];
  knownGaps: AttentionItem[];
  onOpenGame: (gameId: string) => void;
}

export default function AttentionSections({ needsAttention, knownGaps, onOpenGame }: Props) {
  return (
    <div className="grid gap-3 lg:grid-cols-2">
      <Section
        title="Needs Attention"
        description="Current conditions that can still be investigated or corrected safely."
        icon={AlertTriangle}
        tone={needsAttention.length > 0 ? "text-[hsl(var(--destructive))]" : "text-muted-foreground"}
        items={needsAttention}
        defaultOpen={needsAttention.length > 0}
        emptyLabel="Nothing actionable in this selection."
        onOpenGame={onOpenGame}
      />
      <Section
        title="Known Gaps"
        description="Truthful historical evidence that cannot be safely recovered. Kept for QA and audit; no ongoing response required."
        icon={History}
        tone="text-[hsl(var(--level-elevated))]"
        items={knownGaps}
        defaultOpen={false}
        emptyLabel="No historical gaps recorded in this selection."
        onOpenGame={onOpenGame}
      />
    </div>
  );
}
