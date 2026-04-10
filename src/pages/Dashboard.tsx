import AppShell from "@/components/AppShell";
import KpiCards from "@/components/dashboard/KpiCards";
import GamesTable from "@/components/dashboard/GamesTable";
import TeamMetrics from "@/components/dashboard/TeamMetrics";
import TrendChart from "@/components/dashboard/TrendChart";
import InsightsPanel from "@/components/dashboard/InsightsPanel";

export default function Dashboard() {
  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">NFL season analytics overview</p>
        </div>

        <KpiCards />

        <div className="grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-3">
            <TrendChart />
          </div>
          <div className="lg:col-span-2">
            <InsightsPanel />
          </div>
        </div>

        <GamesTable />

        <TeamMetrics />
      </div>
    </AppShell>
  );
}
