import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
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
import { useRunVisibility, useRunVisibilityDay, useRunVisibilityGame } from "@/hooks/useRunVisibility";
import {
  DEFAULT_LEARNING_RUN_ID,
  DEFAULT_LIMIT,
  MAX_RANGE_DAYS,
  inclusiveDayCount,
  resolveRange,
  type DatePreset,
  type RunVisibilityFilters,
  type SeasonType,
} from "@/lib/run-visibility";
import { RunVisibilityError, safeErrorMessage } from "@/lib/run-visibility-api";
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

function errorKind(error: unknown): string | undefined {
  return error instanceof RunVisibilityError ? error.kind : undefined;
}

function ErrorPanel({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const kind = errorKind(error);
  const retryable = kind !== "forbidden" && kind !== "unauthenticated" && kind !== "source_unavailable";
  const diagnostic = safeDiagnostic(error);

  return (
    <Card className="border-destructive/40 bg-destructive/5">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className="flex items-start gap-2 text-sm text-foreground">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[hsl(var(--destructive))]" aria-hidden />
            {safeErrorMessage(error)}
          </p>
          {diagnostic && (
            <p
              data-testid="run-visibility-diagnostic"
              className="break-all pl-6 font-mono text-[11px] leading-relaxed text-muted-foreground"
            >
              {diagnostic}
            </p>
          )}
        </div>
        {retryable && (
          <Button variant="outline" size="sm" onClick={onRetry}>
            Try again
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminRunVisibility() {
  const { user, signOut } = useAuth();
  const { data: me, isLoading: meLoading } = useMe(Boolean(user));

  const [season, setSeason] = useState("2026");
  const [seasonType, setSeasonType] = useState<SeasonType>("preseason");
  const [datePreset, setDatePreset] = useState<DatePreset>("recent_18_days");
  const defaults = resolveRange({
    season: "2026",
    seasonType: "preseason",
    learningRunId: DEFAULT_LEARNING_RUN_ID,
    datePreset: "recent_18_days",
  });
  const [startDate, setStartDate] = useState(defaults.startDate);
  const [endDate, setEndDate] = useState(defaults.endDate);
  const [gameWeek, setGameWeek] = useState<string | undefined>(undefined);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [attentionOnly, setAttentionOnly] = useState(false);
  const [openGameId, setOpenGameId] = useState<string | null>(null);
  const [loadedAt, setLoadedAt] = useState<string | undefined>(undefined);

  const filters = useMemo<RunVisibilityFilters>(
    () => ({
      season,
      seasonType,
      learningRunId: DEFAULT_LEARNING_RUN_ID,
      datePreset,
      startDate,
      endDate,
      gameWeek,
      limit: DEFAULT_LIMIT,
    }),
    [season, seasonType, datePreset, startDate, endDate, gameWeek],
  );

  const overviewQuery = useRunVisibility(filters);
  const dayQuery = useRunVisibilityDay(filters, selectedDate);
  const detailQuery = useRunVisibilityGame(filters, openGameId, selectedDate);

  const data = overviewQuery.data;
  const isLoading = overviewQuery.isLoading;

  useEffect(() => {
    if (overviewQuery.dataUpdatedAt) {
      setLoadedAt(new Date(overviewQuery.dataUpdatedAt).toISOString().replace("T", " ").slice(0, 19) + " UTC");
    }
  }, [overviewQuery.dataUpdatedAt]);

  // A stale week selection is cleared so the bounded range still renders.
  useEffect(() => {
    if (errorKind(overviewQuery.error) === "week_not_found" && gameWeek) setGameWeek(undefined);
  }, [overviewQuery.error, gameWeek]);

  // A game that no longer exists closes the drawer without touching the overview.
  useEffect(() => {
    if (errorKind(detailQuery.error) === "game_not_found") setOpenGameId(null);
  }, [detailQuery.error]);

  const allDays = data?.overview.days ?? [];
  const visibleDays = attentionOnly ? allDays.filter((day) => day.needs_attention > 0) : allDays;
  const selectedDay = allDays.find((day) => day.game_date === selectedDate);
  const dayGames = dayQuery.data?.games ?? [];

  const selectDay = (date?: string) => {
    setSelectedDate(date);
    setOpenGameId(null);
  };

  const range = resolveRange(filters);
  const rangeDays = inclusiveDayCount(range.startDate, range.endDate);
  const rangeInvalid = !Number.isFinite(rangeDays) || rangeDays < 1 || rangeDays > MAX_RANGE_DAYS;
  const isAdmin = me?.is_admin === true;

  if (meLoading) {
    return (
      <AppShell showGuide={false}>
        <p className="py-16 text-center text-sm text-muted-foreground">Checking admin access…</p>
      </AppShell>
    );
  }

  if (!isAdmin || errorKind(overviewQuery.error) === "forbidden") {
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
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="border-border text-muted-foreground">
                  Development / Read Only
                </Badge>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void overviewQuery.refetch();
                    if (selectedDate) void dayQuery.refetch();
                  }}
                  disabled={overviewQuery.isFetching}
                >
                  <RefreshCw className={overviewQuery.isFetching ? "mr-1 h-3.5 w-3.5 animate-spin" : "mr-1 h-3.5 w-3.5"} />
                  Refresh
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Evidence generated {data?.generated_at || "—"}</p>
              <p className="text-xs text-muted-foreground">Loaded {loadedAt ?? "—"}</p>
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
                Showing {range.startDate} to {range.endDate}. The endpoint accepts a maximum {MAX_RANGE_DAYS}-day
                inclusive range; Season to Date stays disabled until a season-wide index exists.
              </p>

              {rangeInvalid && (
                <p className="text-xs text-[hsl(var(--destructive))] sm:col-span-2 lg:col-span-4">
                  Select a range between 1 and {MAX_RANGE_DAYS} days.
                </p>
              )}
            </CardContent>
          </Card>
        </header>

        {overviewQuery.error && !rangeInvalid && (
          <ErrorPanel error={overviewQuery.error} onRetry={() => void overviewQuery.refetch()} />
        )}

        {isLoading && !data ? (
          <div className="space-y-3">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : data ? (
          <>
            <OverviewCards overview={data.overview} />

            {data.overview.truncated && (
              <Card className="border-border bg-muted/40">
                <CardContent className="p-3 text-xs text-muted-foreground">
                  Result limit reached — narrow the date range or week. Day counts below cover the{" "}
                  {data.overview.returned} returned games only, not every scheduled game in this range.
                </CardContent>
              </Card>
            )}

            <WeekCards
              weeks={data.overview.weeks}
              selected={gameWeek}
              onSelect={(week) => {
                setGameWeek(week);
                selectDay(undefined);
              }}
            />
            <AttentionSummary
              days={allDays}
              needsAttention={data.attention.needs_attention}
              knownGaps={data.attention.known_gaps}
              onSelectDay={(date) => {
                setAttentionOnly(false);
                selectDay(date);
              }}
              onShowAttentionDays={() => {
                setAttentionOnly(true);
                selectDay(undefined);
              }}
            />

            {attentionOnly && (
              <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-muted/40 px-3 py-2">
                <p className="text-xs text-muted-foreground">Showing only days with active attention.</p>
                <Button variant="ghost" size="sm" onClick={() => setAttentionOnly(false)}>
                  Show all days
                </Button>
              </div>
            )}

            <DaySummaryList days={visibleDays} selectedDate={selectedDate} onSelect={selectDay} />

            {selectedDay ? (
              dayQuery.error ? (
                <ErrorPanel error={dayQuery.error} onRetry={() => void dayQuery.refetch()} />
              ) : dayQuery.isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : (
                <GameJourneyTable games={dayGames} dayLabel={selectedDay.label} onOpenGame={setOpenGameId} />
              )
            ) : (
              <Card className="border-border bg-card">
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  Select a day above to review its games.
                </CardContent>
              </Card>
            )}

            <RecentRuns runs={data.recent_runs} />
          </>
        ) : null}

        <GameDetailDrawer
          gameId={openGameId}
          game={detailQuery.data?.selected_game ?? null}
          isLoading={detailQuery.isLoading}
          error={detailQuery.error}
          onClose={() => setOpenGameId(null)}
        />
      </div>
    </AppShell>
  );
}
