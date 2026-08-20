import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import OverviewCards from "@/components/run-visibility/OverviewCards";
import WeekCards from "@/components/run-visibility/WeekCards";
import DaySummaryList from "@/components/run-visibility/DaySummaryList";
import GameJourneyTable from "@/components/run-visibility/GameJourneyTable";
import AttentionSummary from "@/components/run-visibility/AttentionSummary";
import RecentRuns from "@/components/run-visibility/RecentRuns";
import GameDetailDrawer from "@/components/run-visibility/GameDetailDrawer";
import { useRunVisibility, useRunVisibilityGame } from "@/hooks/useRunVisibility";
import {
  DEFAULT_LEARNING_RUN_ID,
  MAX_RANGE_DAYS,
  resolveRange,
  type DatePreset,
  type RunVisibilityFilters,
  type SeasonType,
} from "@/lib/run-visibility";
import { useMe } from "@/lib/admin-api";
import { useAuth } from "@/contexts/AuthContext";

const PRESETS: Array<{ value: DatePreset; label: string; disabled?: boolean }> = [
  { value: "current_week", label: "Current Week" },
  { value: "recent_18_days", label: "Recent 18 Days" },
  { value: "custom", label: "Custom Range" },
  { value: "season_to_date", label: "Season to Date", disabled: true },
];

const SEASON_TYPES: Array<{ value: SeasonType; label: string }> = [
  { value: "preseason", label: "Preseason" },
  { value: "regular", label: "Regular Season" },
  { value: "postseason", label: "Postseason" },
];

export default function AdminRunVisibility() {
  const { user, signOut } = useAuth();
  const { data: me, isLoading: meLoading } = useMe(Boolean(user));

  const [season, setSeason] = useState("2026");
  const [seasonType, setSeasonType] = useState<SeasonType>("preseason");
  const [datePreset, setDatePreset] = useState<DatePreset>("recent_18_days");
  const [startDate, setStartDate] = useState("2026-08-03");
  const [endDate, setEndDate] = useState("2026-08-20");
  const [gameWeek, setGameWeek] = useState<string | undefined>(undefined);
  const [openGameId, setOpenGameId] = useState<string | null>(null);

  const filters = useMemo<RunVisibilityFilters>(
    () => ({
      season,
      seasonType,
      learningRunId: DEFAULT_LEARNING_RUN_ID,
      datePreset,
      startDate,
      endDate,
      gameWeek,
    }),
    [season, seasonType, datePreset, startDate, endDate, gameWeek],
  );

  const { data, isLoading } = useRunVisibility(filters);
  const { data: detailData, isLoading: detailLoading } = useRunVisibilityGame(filters, openGameId);

  const range = resolveRange(filters);
  const isAdmin = me?.is_admin === true;

  if (meLoading) {
    return (
      <AppShell showGuide={false}>
        <p className="py-16 text-center text-sm text-muted-foreground">Checking admin access…</p>
      </AppShell>
    );
  }

  if (!isAdmin) {
    return (
      <AppShell showGuide={false}>
        <div className="flex min-h-[50vh] items-center justify-center px-4">
          <Card className="w-full max-w-sm border-border bg-card">
            <CardContent className="space-y-4 p-6 text-center">
              <h1 className="text-lg font-semibold text-foreground">Admin access required</h1>
              <p className="text-sm text-muted-foreground">
                {user?.email ?? "This account"} is not authorized for GameLens administration tools.
              </p>
              <Button variant="outline" className="w-full" onClick={() => void signOut()}>
                Sign out
              </Button>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell showGuide={false}>
      <div className="space-y-6">
        <header className="space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">GameLens Run Visibility</h1>
              <p className="text-sm text-muted-foreground">
                Follow each scheduled game through data loading, pregame capture, and postgame learning.
              </p>
            </div>
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <Badge variant="outline" className="border-border text-muted-foreground">
                Development / Read Only
              </Badge>
              <p className="text-xs text-muted-foreground">
                Last refreshed {data?.generated_at ?? "—"}
              </p>
            </div>
          </div>

          <Card className="border-border bg-card">
            <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label htmlFor="rv-season" className="text-xs text-muted-foreground">Season</Label>
                <Select value={season} onValueChange={setSeason}>
                  <SelectTrigger id="rv-season"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2026">2026</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rv-season-type" className="text-xs text-muted-foreground">Season type</Label>
                <Select value={seasonType} onValueChange={(v) => setSeasonType(v as SeasonType)}>
                  <SelectTrigger id="rv-season-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEASON_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rv-preset" className="text-xs text-muted-foreground">Date range</Label>
                <Select value={datePreset} onValueChange={(v) => setDatePreset(v as DatePreset)}>
                  <SelectTrigger id="rv-preset"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value} disabled={p.disabled}>
                        <span className="flex items-center gap-2">
                          {p.label}
                          {p.disabled && (
                            <span className="rounded border border-border px-1 text-[10px] text-muted-foreground">
                              Future
                            </span>
                          )}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rv-week" className="text-xs text-muted-foreground">Week</Label>
                <Select
                  value={gameWeek ?? "all"}
                  onValueChange={(v) => setGameWeek(v === "all" ? undefined : v)}
                >
                  <SelectTrigger id="rv-week"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All visible weeks</SelectItem>
                    {data?.overview.weeks.map((w) => (
                      <SelectItem key={w.game_week} value={w.game_week}>{w.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {datePreset === "custom" && (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="rv-start" className="text-xs text-muted-foreground">Start date</Label>
                    <Input id="rv-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="rv-end" className="text-xs text-muted-foreground">End date</Label>
                    <Input id="rv-end" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </>
              )}

              <p className="text-xs text-muted-foreground sm:col-span-2 lg:col-span-4">
                Showing {range.startDate} to {range.endDate}. The protected endpoint accepts a maximum {MAX_RANGE_DAYS}-day
                range today; Season to Date is a future concept and stays disabled until a season-wide week index exists.
              </p>
            </CardContent>
          </Card>
        </header>

        {isLoading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : data ? (
          <>
            <OverviewCards overview={data.overview} />
            <WeekCards weeks={data.overview.weeks} selected={gameWeek} onSelect={setGameWeek} />
            <AttentionSections
              needsAttention={data.attention.needs_attention}
              knownGaps={data.attention.known_gaps}
              onOpenGame={setOpenGameId}
            />
            <GameJourneyTable games={data.games} onOpenGame={setOpenGameId} />
            <RecentRuns runs={data.recent_runs} />
          </>
        ) : null}

        <GameDetailDrawer
          gameId={openGameId}
          game={detailData?.selected_game ?? null}
          isLoading={detailLoading}
          onClose={() => setOpenGameId(null)}
        />
      </div>
    </AppShell>
  );
}
