import { AlertTriangle, CalendarDays, Camera, Database, History } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { RunVisibilityOverview } from "@/lib/run-visibility";

interface Item {
  label: string;
  value: string;
  hint: string;
  icon: typeof Database;
  tone: string;
}

export default function OverviewCards({ overview }: { overview: RunVisibilityOverview }) {
  const needsAttention = overview.needs_attention;

  const items: Item[] = [
    {
      label: "Source Tables",
      value: `${overview.source_tables_available} of ${overview.source_tables_total} available`,
      hint: "Pipeline inputs reachable",
      icon: Database,
      tone: "text-muted-foreground",
    },
    {
      label: "Scheduled Games",
      value: String(overview.scheduled_games),
      hint: "In the selected range",
      icon: CalendarDays,
      tone: "text-muted-foreground",
    },
    {
      label: "Canonical Captures",
      value: String(overview.canonical_captures),
      hint: "Snapshots frozen before kickoff",
      icon: Camera,
      tone: "text-primary",
    },
    {
      label: "Needs Attention",
      value: String(needsAttention),
      hint: needsAttention > 0 ? "Can still be investigated" : "Nothing actionable right now",
      icon: AlertTriangle,
      tone: needsAttention > 0 ? "text-[hsl(var(--destructive))]" : "text-muted-foreground",
    },
    {
      label: "Known Gaps",
      value: String(overview.known_gaps),
      hint: "Historical, not recoverable",
      icon: History,
      tone: "text-[hsl(var(--level-elevated))]",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((item) => (
        <Card key={item.label} className="border-border bg-card">
          <CardContent className="space-y-1 p-4">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              <item.icon className={cn("h-3.5 w-3.5", item.tone)} aria-hidden />
              <span className="truncate">{item.label}</span>
            </div>
            <p className={cn("text-lg font-semibold leading-tight", item.tone)}>{item.value}</p>
            <p className="text-xs text-muted-foreground">{item.hint}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
