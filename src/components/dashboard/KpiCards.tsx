import { kpiData } from "@/lib/sample-data";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, Users, Trophy, BarChart3 } from "lucide-react";

const cards = [
  { label: "Games Tracked", value: kpiData.gamesTracked, icon: Trophy, format: "number" },
  { label: "Teams Covered", value: kpiData.teamsCovered, icon: Users, format: "number" },
  { label: "Avg Points / Game", value: kpiData.avgPoints, icon: Activity, format: "decimal" },
  {
    label: "Weekly Trend",
    value: kpiData.weeklyTrendValue,
    icon: BarChart3,
    format: "trend",
    direction: kpiData.weeklyTrendDirection,
  },
] as const;

export default function KpiCards() {
  return (
    <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
      {cards.map((c) => (
        <Card key={c.label} className="border-border bg-card">
          <CardContent className="flex items-start justify-between p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{c.label}</p>
              <p className="text-2xl font-bold text-foreground">
                {c.format === "trend" ? (
                  <span className="flex items-center gap-1">
                    {c.direction === "up" ? (
                      <TrendingUp className="h-5 w-5 text-accent" />
                    ) : (
                      <TrendingDown className="h-5 w-5 text-destructive" />
                    )}
                    +{c.value}%
                  </span>
                ) : c.format === "decimal" ? (
                  c.value.toFixed(1)
                ) : (
                  c.value
                )}
              </p>
            </div>
            <div className="rounded-md bg-primary/10 p-2">
              <c.icon className="h-4 w-4 text-primary" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
