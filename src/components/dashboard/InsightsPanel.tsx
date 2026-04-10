import { sampleInsights } from "@/lib/sample-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, AlertTriangle, StickyNote } from "lucide-react";

const iconMap = {
  trend: TrendingUp,
  alert: AlertTriangle,
  note: StickyNote,
} as const;

const colorMap = {
  trend: "text-accent",
  alert: "text-destructive",
  note: "text-primary",
} as const;

export default function InsightsPanel() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Quick Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sampleInsights.map((insight) => {
          const Icon = iconMap[insight.type];
          return (
            <div key={insight.id} className="flex gap-3 rounded-md border border-border bg-secondary/30 p-3">
              <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${colorMap[insight.type]}`} />
              <p className="text-sm leading-relaxed text-secondary-foreground">{insight.text}</p>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
