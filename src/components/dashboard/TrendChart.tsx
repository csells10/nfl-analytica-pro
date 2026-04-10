import { sampleWeeklyTrends } from "@/lib/sample-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function TrendChart() {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold">Avg Points / Game Trend</CardTitle>
      </CardHeader>
      <CardContent className="h-64 pr-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={sampleWeeklyTrends} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
            <defs>
              <linearGradient id="gradientPoints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="hsl(210, 100%, 56%)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="hsl(210, 100%, 56%)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220, 14%, 20%)" vertical={false} />
            <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
            <YAxis domain={[18, 28]} tick={{ fontSize: 11, fill: "hsl(215, 12%, 55%)" }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(220, 18%, 13%)",
                border: "1px solid hsl(220, 14%, 20%)",
                borderRadius: "8px",
                fontSize: 12,
                color: "hsl(210, 20%, 92%)",
              }}
            />
            <Area type="monotone" dataKey="avgPoints" stroke="hsl(210, 100%, 56%)" strokeWidth={2} fill="url(#gradientPoints)" />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
