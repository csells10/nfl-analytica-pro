import { Component, useCallback, useMemo, type ErrorInfo, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import {
  useClaimHealth,
  isClaimHealthGrain,
  type ClaimHealthGrain,
  type ClaimHealthResponse,
  type MatrixRow,
  type ConfidenceMatrixRow,
  type CalibrationOverTimeRow,
  type GameLevelCalibrationRow,
  type CoreAreaAlignmentRow,
  type PillarHealthRow,
  type PillarWeeklyHealthRow,
  type FeatureHealthRow,
  type SectionMeta,
  type TabSpec,
} from "@/lib/admin-api";
import { ApiError } from "@/lib/nfl-api";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

const RUN_ID = "full_2025_reg_post_claim_matrix_pilot";
const SEASON = "2025";

// ---------- Helpers ----------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function formatPercent(value: unknown): string {
  if (!isNum(value)) return "—";
  const pct = Math.abs(value) <= 1.5 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
}

function formatCount(value: unknown): string {
  if (!isNum(value)) return "—";
  return value.toLocaleString();
}

function formatNumber(value: unknown, digits = 2): string {
  if (!isNum(value)) return "—";
  return value.toFixed(digits);
}

function deltaVsBaseline(rowRate: unknown, baselineRate: unknown): number | null {
  if (!isNum(rowRate) || !isNum(baselineRate)) return null;
  const r = Math.abs(rowRate) <= 1.5 ? rowRate * 100 : rowRate;
  const b = Math.abs(baselineRate) <= 1.5 ? baselineRate * 100 : baselineRate;
  return r - b;
}

function formatDelta(delta: number | null): string {
  if (delta === null || !Number.isFinite(delta)) return "—";
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(1)} pts`;
}

function formatLiftRate(lift: unknown): string {
  // Lift values may be expressed as 0-1 fractions; convert to pts.
  if (!isNum(lift)) return "—";
  const pts = Math.abs(lift) <= 1.5 ? lift * 100 : lift;
  const sign = pts >= 0 ? "+" : "";
  return `${sign}${pts.toFixed(1)} pts`;
}

function liftClass(lift: unknown): string {
  if (!isNum(lift)) return "text-muted-foreground";
  const pts = Math.abs(lift) <= 1.5 ? lift * 100 : lift;
  if (pts >= 0.5) return "text-[hsl(var(--success))]";
  if (pts <= -0.5) return "text-[hsl(var(--destructive))]";
  return "text-muted-foreground";
}

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  if (delta >= 0.5) return "text-[hsl(var(--success))]";
  if (delta <= -0.5) return "text-[hsl(var(--destructive))]";
  return "text-muted-foreground";
}

function isSmallSample(row: { claim_row_count?: number; game_count?: number }): boolean {
  const c = row.claim_row_count ?? 0;
  const g = row.game_count ?? 0;
  return c < 30 || g < 10;
}

function SmallSampleBadge() {
  return (
    <Badge variant="outline" className="ml-2 border-dashed text-[10px] font-normal text-muted-foreground">
      small sample
    </Badge>
  );
}

function rateToPct(v: unknown): number | null {
  if (!isNum(v)) return null;
  return Math.abs(v) <= 1.5 ? v * 100 : v;
}

function bucketToLabel(bucket: string): string {
  const map: Record<string, string> = {
    repeat_positive_strong: "Repeat Positive Strong",
    repeat_positive_supportive: "Repeat Positive Supportive",
    not_relevant: "Not Relevant",
    context_only: "Context Only",
    negative_caution: "Negative Caution",
    mixed_near_even: "Mixed / Near Even",
    anchor_unavailable: "Anchor Unavailable",
    caution_only: "Caution Only",
    opposing_efficiency_signal: "Opposing Efficiency Signal",
  };
  return map[bucket] ?? bucket
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function snakeToTitle(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncateLabel(label: string, max = 28): string {
  if (label.length <= max) return label;
  return label.slice(0, max) + "…";
}

// ---------- Page ----------

class AdminErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[admin] render error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <Card>
          <CardContent className="p-6">
            <div className="text-base font-medium text-foreground">Something went wrong rendering the dashboard.</div>
            <div className="mt-1 text-sm text-muted-foreground">{this.state.error.message}</div>
          </CardContent>
        </Card>
      );
    }
    return this.props.children;
  }
}

/**
 * Read a section by name, tolerating either a nested `sections` envelope or
 * a flat top-level shape. Never throws; always returns an array.
 */
function readSection<T>(
  data: ClaimHealthResponse | undefined,
  key: string,
): T[] {
  if (!data) return [];
  const nested = (data.sections as Record<string, unknown> | undefined)?.[key];
  if (Array.isArray(nested)) return nested as T[];
  const flat = (data as unknown as Record<string, unknown>)[key];
  if (Array.isArray(flat)) return flat as T[];
  return [];
}

function sectionMeta(data: ClaimHealthResponse | undefined, id: string): SectionMeta {
  return (data?.section_metadata?.[id] ?? {}) as SectionMeta;
}

export default function AdminClaimHealth() {
  const { data, isLoading, isFetching, error } = useClaimHealth(RUN_ID, SEASON);

  return (
    <AppShell showGuide={false}>
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Calibration &amp; Claim Health</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Tracks two distinct things: game-level calibration (did directional reads align with results?)
            and claim health (were GameLens claims supported by postgame data?). These are not the same as
            winner prediction accuracy.
          </p>
          {data && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs text-muted-foreground">
              {data.run_id && <span>run_id: <span className="font-mono text-foreground/80">{data.run_id}</span></span>}
              {data.season !== undefined && <span>season: <span className="font-mono text-foreground/80">{String(data.season)}</span></span>}
              {data.generated_at && <span>generated_at: <span className="font-mono text-foreground/80">{data.generated_at}</span></span>}
              {data.scope && <span>scope: <span className="font-mono text-foreground/80">{data.scope}</span></span>}
              {data.status && <span>status: <span className="font-mono text-foreground/80">{data.status}</span></span>}
              {typeof data.available === "boolean" && <span>available: <span className="font-mono text-foreground/80">{String(data.available)}</span></span>}
            </div>
          )}
        </header>

        <AdminErrorBoundary>
          {isLoading && !data && (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground">
                Loading claim health…
              </CardContent>
            </Card>
          )}

          {error && !data && <ErrorState error={error} />}

          {data && (
            <TooltipProvider delayDuration={150}>
              <HowToRead data={data} />
              <DashboardTabs data={data} />
            </TooltipProvider>
          )}

          {!isLoading && !data && !error && (
            <Card>
              <CardContent className="p-8 text-sm text-muted-foreground">
                No claim health data available.
              </CardContent>
            </Card>
          )}

          {isFetching && data && (
            <div className="text-xs text-muted-foreground">Refreshing…</div>
          )}
        </AdminErrorBoundary>
      </div>
    </AppShell>
  );
}

function ErrorState({ error }: { error: unknown }) {
  let title = "Failed to load claim health.";
  let detail = "Please try again.";
  if (error instanceof ApiError) {
    if (error.kind === "forbidden") {
      title = "Admin access required.";
      detail = "Your account does not have admin privileges for this dashboard.";
    } else if (error.kind === "unauthenticated") {
      title = "Not signed in.";
      detail = "Your session has expired. Please sign in again to view this page.";
    } else if (error.kind === "network") {
      title = "Network error.";
      detail = "Check your connection and retry.";
    }
  } else if (error instanceof Error && error.message) {
    detail = error.message;
  }
  return (
    <Card>
      <CardContent className="p-6">
        <div className="text-base font-medium text-foreground">{title}</div>
        <div className="mt-1 text-sm text-muted-foreground">{detail}</div>
      </CardContent>
    </Card>
  );
}

// ---------- How to read ----------

function HowToRead({ data }: { data: ClaimHealthResponse }) {
  const notes = data.formula_notes ?? {};
  const phases = data.season_phase_groups ?? {};
  return (
    <Collapsible className="rounded-lg border border-border bg-card">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40">
        How to read this dashboard
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-4 border-t border-border px-4 py-4 text-sm text-muted-foreground">
        <ul className="list-disc space-y-1 pl-5">
          <li>Claim validation is not the same as game pick accuracy.</li>
          <li>No-pick games are tracked separately and excluded from game-pick rates.</li>
          <li>Neutral / mixed claim results are useful calibration feedback, not failures.</li>
          <li>Surface Matrix is technical debug, not the headline story.</li>
          <li>Week 1 may have missing claim rows when pregame ranking/window context was unavailable.</li>
        </ul>
        {Object.keys(notes).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Formulas</div>
            <div className="grid gap-2 sm:grid-cols-2">
              {Object.entries(notes).map(([k, n]) => (
                <div key={k} className="rounded-md border border-border bg-background/60 p-3">
                  <div className="text-xs font-medium text-foreground">{snakeToTitle(k)}</div>
                  {n.meaning && <div className="mt-1 text-xs">{n.meaning}</div>}
                  {n.formula && (
                    <div className="mt-1 font-mono text-[11px] text-foreground/80">{n.formula}</div>
                  )}
                  {n.note && <div className="mt-1 text-[11px]">{n.note}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
        {Object.keys(phases).length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wide text-foreground/80">Season phases</div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(phases).map(([k, p]) => (
                <div key={k} className="rounded-md border border-border bg-background/60 p-3 text-xs">
                  <div className="font-medium text-foreground">{p.label ?? snakeToTitle(k)}</div>
                  {Array.isArray(p.weeks) && p.weeks.length > 0 && (
                    <div className="mt-0.5 text-muted-foreground">Weeks {p.weeks.join(", ")}</div>
                  )}
                  {p.description && <div className="mt-1">{p.description}</div>}
                </div>
              ))}
            </div>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

// ---------- Tabs ----------

const FALLBACK_TABS: TabSpec[] = [
  { id: "overview", label: "Overview", description: "Coverage, baseline, and calibration trend." },
  { id: "game_calibration", label: "Game Calibration", description: "Did directional game reads align with results?" },
  { id: "core_area_alignment", label: "Core Area Alignment", description: "How Matchup Lean behaved across confirmed, split, and conflicting profiles." },
  { id: "pillar_health", label: "Pillar Health", description: "Which football pillars are producing truthful claims." },
  { id: "feature_health", label: "Feature Health", description: "Which engineered features are earning trust." },
  { id: "technical_debug", label: "Technical Debug", description: "Claim surface QA and regression checks." },
];

function DashboardTabs({ data }: { data: ClaimHealthResponse }) {
  const tabs = data.tabs && data.tabs.length > 0 ? data.tabs : FALLBACK_TABS;
  const defaultTab = data.default_tab && tabs.some((t) => t.id === data.default_tab)
    ? data.default_tab
    : tabs[0].id;

  return (
    <Tabs defaultValue={defaultTab} className="space-y-4">
      <TabsList className="flex flex-wrap gap-1 bg-muted/60">
        {tabs.map((t) => (
          <TabsTrigger key={t.id} value={t.id} className="capitalize">
            {t.label ?? snakeToTitle(t.id)}
          </TabsTrigger>
        ))}
      </TabsList>
      {tabs.map((t) => (
        <TabsContent key={t.id} value={t.id} className="space-y-6">
          {t.description && (
            <p className="text-sm text-muted-foreground">{t.description}</p>
          )}
          <TabBody tabId={t.id} data={data} />
        </TabsContent>
      ))}
    </Tabs>
  );
}

function TabBody({ tabId, data }: { tabId: string; data: ClaimHealthResponse }) {
  switch (tabId) {
    case "overview":
      return <OverviewTab data={data} />;
    case "game_calibration":
      return <GameCalibrationTab data={data} />;
    case "core_area_alignment":
      return <CoreAreaAlignmentTab data={data} />;
    case "pillar_health":
      return <PillarHealthTab data={data} />;
    case "feature_health":
      return <FeatureHealthTab data={data} />;
    case "technical_debug":
      return <TechnicalDebugTab data={data} />;
    default:
      return (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            No renderer for tab "{tabId}".
          </CardContent>
        </Card>
      );
  }
}

// ---------- Overview tab ----------

function OverviewTab({ data }: { data: ClaimHealthResponse }) {
  const calibRows = readSection<CalibrationOverTimeRow>(data, "calibration_over_time");
  const gameRows = readSection<GameLevelCalibrationRow>(data, "game_level_calibration");
  const meta = sectionMeta(data, "calibration_over_time");
  const grainDefault = meta.grain_default ?? "week";
  return (
    <div className="space-y-6">
      <CoverageBaselineCards data={data} />
      <CalibrationOverTimeChart rows={calibRows} grain={grainDefault} meta={meta} />
      <GameLevelCalibrationCompact rows={gameRows} />
    </div>
  );
}

function CoverageBaselineCards({ data }: { data: ClaimHealthResponse }) {
  const cov = data.coverage ?? {};
  const base = data.baseline ?? {};
  return (
    <section className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Expected games" value={formatCount(cov.expected_games)} />
        <StatCard label="Games with claims" value={formatCount(cov.games_with_claims)} />
        <StatCard label="Games without claims" value={formatCount(cov.games_without_claims)} />
        <StatCard label="Games represented" value={formatCount(base.game_count)} />
      </div>
      {cov.context_note && (
        <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {cov.context_note}
        </div>
      )}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <StatCard label="Overall claim validation" value={formatPercent(base.validation_rate)} />
        <StatCard label="Claim rows" value={formatCount(base.claim_row_count ?? cov.claim_row_count)} />
        <StatCard label="Eligible claim rows" value={formatCount(base.eligible_claim_row_count)} />
        <StatCard label="Validated claims" value={formatCount(base.validated_count)} />
        <StatCard label="Not validated claims" value={formatCount(base.not_validated_count)} />
        <StatCard label="Neutral / mixed claims" value={formatCount(base.neutral_or_mixed_count)} />
      </div>
    </section>
  );
}

function StatCard({ label, value, note }: { label: string; value: React.ReactNode; note?: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription className="text-xs uppercase tracking-wide">{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold text-foreground">{value}</div>
        {note && <div className="mt-2 text-xs text-muted-foreground">{note}</div>}
      </CardContent>
    </Card>
  );
}

// ---------- Calibration Over Time ----------

function CalibrationOverTimeChart({
  rows,
  grain,
  meta,
}: {
  rows: CalibrationOverTimeRow[];
  grain: string;
  meta: SectionMeta;
}) {
  const filtered = useMemo(() => {
    const matching = rows.filter((r) => (r.grain ?? "week") === grain);
    return (matching.length > 0 ? matching : rows).map((r) => ({
      ...r,
      _claim: rateToPct(r.claim_validation_rate),
      _pick: rateToPct(r.game_pick_correct_rate),
      _segment: rateToPct(r.selected_segment_validation_rate),
    }));
  }, [rows, grain]);

  const segmentMatchesOverall = useMemo(() => {
    const source = rows.filter((r) => (r.grain ?? "week") === grain);
    const target = source.length > 0 ? source : rows;
    if (target.length === 0) return false;
    return target.every((r) => r.selected_segment_label === "all_claims_in_period");
  }, [rows, grain]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Calibration Over Time</CardTitle>
        <CardDescription>
          {meta.description ?? "Claim validation, game pick accuracy, and selected segment validation across the season."}
        </CardDescription>
        {segmentMatchesOverall && (
          <div className="mt-2 text-xs text-muted-foreground">
            Selected segment currently matches overall claims.
          </div>
        )}
      </CardHeader>
      <CardContent>
        {filtered.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>
        ) : (
          <div style={{ width: "100%", height: 320 }}>
            <ResponsiveContainer>
              <LineChart data={filtered} margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
                <CartesianGrid stroke="hsl(var(--border))" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="period_label" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
                <RTooltip content={<CalibrationTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="_claim" name="Overall Claim Validation" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                <Line type="monotone" dataKey="_pick" name="Game Pick Accuracy" stroke="hsl(var(--accent-warm))" strokeWidth={2} dot={{ r: 3 }} connectNulls={false} />
                {!segmentMatchesOverall && (
                  <Line type="monotone" dataKey="_segment" name="Selected Segment Validation" stroke="hsl(var(--accent-cool))" strokeWidth={2} strokeDasharray="4 3" dot={{ r: 3 }} connectNulls={false} />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CalibrationTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: CalibrationOverTimeRow }> }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background p-3 text-xs shadow-md">
      <div className="font-medium text-foreground">{r.period_label ?? "—"}</div>
      {(r.period_start || r.period_end) && (
        <div className="text-[10px] text-muted-foreground">{r.period_start ?? "?"} → {r.period_end ?? "?"}</div>
      )}
      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground">
        <div>Claim validation:</div>
        <div className="text-right text-foreground">{formatPercent(r.claim_validation_rate)}</div>
        <div>Eligible claims:</div>
        <div className="text-right">{formatCount(r.eligible_claim_rows)}</div>
        <div>Validated:</div>
        <div className="text-right">{formatCount(r.validated_claims)}</div>
        <div>Not validated:</div>
        <div className="text-right">{formatCount(r.not_validated_claims)}</div>
        <div>Neutral / mixed:</div>
        <div className="text-right">{formatCount(r.neutral_mixed_claims)}</div>
        <div>Unavailable:</div>
        <div className="text-right">{formatCount(r.unavailable_claims)}</div>
        <div className="col-span-2 mt-1 border-t border-border pt-1" />
        <div>Game pick correct:</div>
        <div className="text-right text-foreground">{formatPercent(r.game_pick_correct_rate)}</div>
        <div>Games with pick:</div>
        <div className="text-right">{formatCount(r.games_with_pick)}</div>
        <div>Correct picks:</div>
        <div className="text-right">{formatCount(r.correct_picks)}</div>
        <div>Incorrect picks:</div>
        <div className="text-right">{formatCount(r.incorrect_picks)}</div>
        <div>No-pick games:</div>
        <div className="text-right">{formatCount(r.no_pick_games)}</div>
        {r.selected_segment_label && (
          <>
            <div className="col-span-2 mt-1 border-t border-border pt-1" />
            <div>Segment:</div>
            <div className="text-right text-foreground">{r.selected_segment_label}</div>
            <div>Segment validation:</div>
            <div className="text-right">{formatPercent(r.selected_segment_validation_rate)}</div>
            <div>Lift vs baseline:</div>
            <div className="text-right">{formatLiftRate(r.selected_segment_lift_vs_claim_baseline)}</div>
          </>
        )}
      </div>
    </div>
  );
}

// ---------- Game Level Calibration ----------

const PROFILE_STRENGTH_ORDER = [
  "No Clear Edge",
  "Thin Edge",
  "Mixed Profile",
  "Clear Lean",
  "Strong Profile",
];

const CONFIDENCE_ORDER = ["Low", "Medium", "High"];

function indexBy<T>(rows: T[], rowKey: (r: T) => string, colKey: (r: T) => string): Map<string, Map<string, T>> {
  const m = new Map<string, Map<string, T>>();
  for (const r of rows) {
    const rk = rowKey(r);
    const ck = colKey(r);
    if (!rk || !ck) continue;
    let inner = m.get(rk);
    if (!inner) { inner = new Map(); m.set(rk, inner); }
    inner.set(ck, r);
  }
  return m;
}

function GameLevelCalibrationCompact({ rows }: { rows: GameLevelCalibrationRow[] }) {
  if (rows.length === 0) return null;
  const total = rows.reduce((acc, r) => {
    acc.games += r.game_count ?? 0;
    acc.correct += r.correct_count ?? 0;
    acc.incorrect += r.incorrect_count ?? 0;
    acc.noPick += r.no_pick_count ?? 0;
    return acc;
  }, { games: 0, correct: 0, incorrect: 0, noPick: 0 });
  const denom = total.correct + total.incorrect;
  const correctPct = denom > 0 ? (total.correct / denom) * 100 : null;
  const noPickPct = total.games > 0 ? (total.noPick / total.games) * 100 : null;
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Game-Level Calibration (summary)</CardTitle>
        <CardDescription>Rolled up across all profile/confidence buckets. No-pick games are tracked separately.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard label="Total games" value={formatCount(total.games)} />
          <StatCard label="Correct picks" value={formatCount(total.correct)} />
          <StatCard label="Game pick correct" value={correctPct === null ? "—" : `${correctPct.toFixed(1)}%`} />
          <StatCard label="No-pick rate" value={noPickPct === null ? "—" : `${noPickPct.toFixed(1)}%`} />
        </div>
      </CardContent>
    </Card>
  );
}

function GameCalibrationTab({ data }: { data: ClaimHealthResponse }) {
  const rows = readSection<GameLevelCalibrationRow>(data, "game_level_calibration");
  const meta = sectionMeta(data, "game_level_calibration");
  const calibratedRows = readSection<GameLevelCalibrationRow>(data, "calibrated_game_level_calibration");
  const calibratedMeta = sectionMeta(data, "calibrated_game_level_calibration");

  return (
    <div className="space-y-6">
      <GameLevelCalibrationCard
        rows={rows}
        title={meta.title ?? "Game-Level Calibration"}
        description={meta.description ?? "Correct rate is based only on games with a directional pick/lean. No-pick games are shown separately."}
      />
      {calibratedRows.length > 0 && (
        <GameLevelCalibrationCard
          rows={calibratedRows}
          title={calibratedMeta.title ?? "Calibrated Game-Level Calibration"}
          description={calibratedMeta.description}
        />
      )}
    </div>
  );
}

function GameLevelCalibrationCard({
  rows,
  title,
  description,
}: {
  rows: GameLevelCalibrationRow[];
  title: string;
  description?: string;
}) {
  const matrix = useMemo(() => indexBy(rows,
    (r) => r.profile_strength_label ?? "",
    (r) => r.outcome_confidence_label ?? "",
  ), [rows]);
  const presentRows = PROFILE_STRENGTH_ORDER.filter((r) => matrix.has(r)).concat(
    Array.from(matrix.keys()).filter((k) => !PROFILE_STRENGTH_ORDER.includes(k)),
  );
  const presentCols = CONFIDENCE_ORDER;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No data.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile Strength</TableHead>
                {presentCols.map((c) => (
                  <TableHead key={c} className="text-right">{c} confidence</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {presentRows.map((rowKey) => (
                <TableRow key={rowKey}>
                  <TableCell className="font-medium">{rowKey}</TableCell>
                  {presentCols.map((c) => {
                    const cell = matrix.get(rowKey)?.get(c);
                    return (
                      <TableCell key={c} className="text-right align-top">
                        <GameCalibCell row={cell} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function GameCalibCell({ row }: { row?: GameLevelCalibrationRow }) {
  if (!row) return <span className="text-muted-foreground">—</span>;
  const denom = (row.correct_count ?? 0) + (row.incorrect_count ?? 0);
  const noDirectional = denom === 0 && (row.game_count ?? 0) > 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex flex-col items-end gap-0.5 font-mono text-xs">
          <div className="text-foreground">{formatCount(row.game_count)} games</div>
          {noDirectional ? (
            <div className="text-[10px] text-muted-foreground">no directional picks</div>
          ) : (
            <>
              <div>correct {formatPercent(denom > 0 ? (row.correct_count ?? 0) / denom : null)}</div>
              <div className="text-muted-foreground">no-pick {formatPercent(row.no_pick_rate)}</div>
            </>
          )}
          <div className="text-[10px] text-muted-foreground">avg |margin| {formatNumber(row.avg_final_margin_abs, 1)}</div>
        </div>
      </TooltipTrigger>
      <TooltipContent className="text-xs">
        <div>Correct: {formatCount(row.correct_count)}</div>
        <div>Incorrect: {formatCount(row.incorrect_count)}</div>
        <div>No-pick: {formatCount(row.no_pick_count)}</div>
        <div>Close misses: {formatCount(row.close_miss_count)}</div>
        <div>Severe misses: {formatCount(row.severe_miss_count)}</div>
      </TooltipContent>
    </Tooltip>
  );
}

// ---------- Core Area Alignment ----------

const PROFILE_TYPE_ORDER = [
  "confirmed_edge",
  "split_profile",
  "conflicting_profile",
  "coin_flip_profile",
  "no_clear_edge",
];

function CoreAreaAlignmentTab({ data }: { data: ClaimHealthResponse }) {
  const alignRows = readSection<CoreAreaAlignmentRow>(data, "core_area_alignment_matrix");
  const meta = sectionMeta(data, "core_area_alignment_matrix");
  const calibratedRows = readSection<CoreAreaAlignmentRow>(data, "calibrated_core_area_alignment_matrix");
  const calibratedMeta = sectionMeta(data, "calibrated_core_area_alignment_matrix");
  const baselineRate = data.baseline?.validation_rate;

  return (
    <div className="space-y-6">
      <CoreAreaAlignmentCard
        rows={alignRows}
        title={meta.title ?? "Core Area Alignment"}
        description={meta.description ?? "How Matchup Lean behaved when Core Areas confirmed, split, conflicted, or were coin-flippy."}
      />
      {calibratedRows.length > 0 && (
        <CoreAreaAlignmentCard
          rows={calibratedRows}
          title={calibratedMeta.title ?? "Calibrated Core Area Alignment"}
          description={calibratedMeta.description}
        />
      )}

      {/* Legacy: claim validation by core area */}
      <CoreAreaHealth rows={readSection<MatrixRow>(data, "core_area_matrix")} baselineRate={baselineRate} />
      <ConfidenceMatrix rows={readSection<ConfidenceMatrixRow>(data, "confidence_core_area_matrix")} />
    </div>
  );
}

function CoreAreaAlignmentCard({
  rows: alignRows,
  title,
  description,
}: {
  rows: CoreAreaAlignmentRow[];
  title: string;
  description?: string;
}) {
  const matrix = useMemo(() => indexBy(alignRows,
    (r) => r.profile_type ?? "",
    (r) => r.outcome_confidence_label ?? "",
  ), [alignRows]);
  const rows = PROFILE_TYPE_ORDER.filter((r) => matrix.has(r)).concat(
    Array.from(matrix.keys()).filter((k) => !PROFILE_TYPE_ORDER.includes(k)),
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="p-0">
        {alignRows.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground">No data.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Profile Type</TableHead>
                {CONFIDENCE_ORDER.map((c) => (
                  <TableHead key={c} className="text-right">{c} confidence</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((rowKey) => (
                <TableRow key={rowKey}>
                  <TableCell className="font-medium">{snakeToTitle(rowKey)}</TableCell>
                  {CONFIDENCE_ORDER.map((c) => {
                    const cell = matrix.get(rowKey)?.get(c);
                    return (
                      <TableCell key={c} className="text-right align-top font-mono text-xs">
                        {cell ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <div className="text-foreground">{formatCount(cell.game_count)} games</div>
                            <div>correct {formatPercent(cell.correct_rate)}</div>
                            <div className="text-muted-foreground">core gap {formatNumber(cell.avg_core_gap, 2)}</div>
                            <div className="text-muted-foreground">signal gap {formatNumber(cell.avg_signal_gap, 2)}</div>
                            <div className="text-[10px] text-muted-foreground">avg |margin| {formatNumber(cell.avg_final_margin_abs, 1)}</div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Pillar Health ----------

function PillarHealthTab({ data }: { data: ClaimHealthResponse }) {
  const pillarRows = readSection<PillarHealthRow>(data, "pillar_health_matrix");
  const weeklyRows = readSection<PillarWeeklyHealthRow>(data, "pillar_weekly_health");
  const pillarMeta = sectionMeta(data, "pillar_health_matrix");
  const weeklyMeta = sectionMeta(data, "pillar_weekly_health");
  const baselineRate = data.baseline?.validation_rate;
  const baselinePct = rateToPct(baselineRate);

  const sortedPillars = useMemo(() => {
    const copy = [...pillarRows];
    copy.sort((a, b) => {
      const ca = (a.core_area ?? "").localeCompare(b.core_area ?? "");
      if (ca !== 0) return ca;
      return (rateToPct(b.validation_rate) ?? -1) - (rateToPct(a.validation_rate) ?? -1);
    });
    return copy;
  }, [pillarRows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{pillarMeta.title ?? "Pillar Health Matrix"}</CardTitle>
          <CardDescription>
            {pillarMeta.description ?? "Claim validation by core area and category. This is claim quality, not game pick accuracy."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedPillars.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Core Area</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Validation Rate</TableHead>
                  <TableHead className="text-right">Claim Rows</TableHead>
                  <TableHead className="text-right">Lift vs Baseline</TableHead>
                  <TableHead className="text-right">Neutral / Mixed</TableHead>
                  <TableHead className="text-right">Games Represented</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedPillars.map((r, i) => (
                  <TableRow key={`${r.core_area}-${r.category}-${i}`}>
                    <TableCell className="text-muted-foreground">{r.core_area ?? "—"}</TableCell>
                    <TableCell className="font-medium">{r.category ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(r.validation_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCount(r.claim_rows)}</TableCell>
                    <TableCell className={`text-right font-mono ${liftClass(r.lift_vs_claim_baseline)}`}>
                      {formatLiftRate(r.lift_vs_claim_baseline)}
                    </TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(r.neutral_mixed_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCount(r.games_represented)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{weeklyMeta.title ?? "Pillar Weekly Health"}</CardTitle>
          <CardDescription>
            {weeklyMeta.description ?? "Weekly audit of claim validation, pick accuracy, and confidence."}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {weeklyRows.length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground">No data.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Week</TableHead>
                  <TableHead className="text-right">Games</TableHead>
                  <TableHead className="text-right">With Claims</TableHead>
                  <TableHead className="text-right">Claim Rows</TableHead>
                  <TableHead className="text-right">Claim Validation</TableHead>
                  <TableHead className="text-right">Game Pick Correct</TableHead>
                  <TableHead className="text-right">No-Pick Rate</TableHead>
                  <TableHead className="text-right">Avg Confidence</TableHead>
                  <TableHead>Top Core Area</TableHead>
                  <TableHead>Weakest Core Area</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {weeklyRows.map((r, i) => (
                  <TableRow key={`${r.game_week}-${i}`}>
                    <TableCell className="font-medium">{r.game_week ?? "—"}</TableCell>
                    <TableCell className="text-right font-mono">{formatCount(r.games_total)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCount(r.games_with_claims)}</TableCell>
                    <TableCell className="text-right font-mono">{formatCount(r.claim_rows)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(r.claim_validation_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(r.game_pick_correct_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatPercent(r.no_pick_rate)}</TableCell>
                    <TableCell className="text-right font-mono">{formatNumber(r.avg_confidence, 2)}</TableCell>
                    <TableCell className="text-muted-foreground">{r.top_core_area ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.weakest_core_area ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Collapsible className="rounded-lg border border-border bg-card">
        <CollapsibleTrigger className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-foreground hover:bg-muted/40">
          Older compatibility matrix (Category Health)
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CategoryHealth rows={readSection<MatrixRow>(data, "category_matrix")} baselineRate={baselineRate} baselinePct={baselinePct} />
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ---------- Feature Health ----------

function FeatureHealthTab({ data }: { data: ClaimHealthResponse }) {
  const rows = readSection<FeatureHealthRow>(data, "feature_health_matrix");
  const meta = sectionMeta(data, "feature_health_matrix");
  const baselineRate = data.baseline?.validation_rate;

  const grouped = useMemo(() => {
    const byGroup = new Map<string, Map<string, FeatureHealthRow[]>>();
    for (const r of rows) {
      const g = r.feature_group ?? "Other";
      const f = r.feature_family ?? "Other";
      let fam = byGroup.get(g);
      if (!fam) { fam = new Map(); byGroup.set(g, fam); }
      const list = fam.get(f) ?? [];
      list.push(r);
      fam.set(f, list);
    }
    return byGroup;
  }, [rows]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{meta.title ?? "Feature Health Matrix"}</CardTitle>
          <CardDescription>
            {meta.description ?? "Engineered features grouped by purpose. Football Calibration features and Data Quality / Metadata features are different signal types and should not be compared as one."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {grouped.size === 0 ? (
            <div className="py-6 text-sm text-muted-foreground">No data.</div>
          ) : (
            Array.from(grouped.entries()).map(([group, families]) => (
              <div key={group} className="space-y-3">
                <div className="text-sm font-semibold text-foreground">{group}</div>
                {Array.from(families.entries()).map(([family, famRows]) => (
                  <div key={family} className="overflow-hidden rounded-md border border-border">
                    <div className="bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                      {snakeToTitle(family)}
                    </div>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Bucket / Group</TableHead>
                          <TableHead className="text-right">Validation Rate</TableHead>
                          <TableHead className="text-right">Lift vs Baseline</TableHead>
                          <TableHead className="text-right">Claim Rows</TableHead>
                          <TableHead className="text-right">Eligible</TableHead>
                          <TableHead className="text-right">Games</TableHead>
                          <TableHead className="text-right">Neutral / Mixed</TableHead>
                          <TableHead>Sample</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {famRows.map((r, i) => (
                          <TableRow key={`${r.bucket_or_group}-${i}`}>
                            <TableCell className="font-medium">{bucketToLabel(r.bucket_or_group ?? "")}</TableCell>
                            <TableCell className="text-right font-mono">{formatPercent(r.validation_rate)}</TableCell>
                            <TableCell className={`text-right font-mono ${liftClass(r.lift_vs_claim_baseline)}`}>{formatLiftRate(r.lift_vs_claim_baseline)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCount(r.claim_rows)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCount(r.eligible_claim_rows)}</TableCell>
                            <TableCell className="text-right font-mono">{formatCount(r.games_represented)}</TableCell>
                            <TableCell className="text-right font-mono">{formatPercent(r.neutral_mixed_rate)}</TableCell>
                            <TableCell>
                              {r.sample_warning ? (
                                <Badge variant="outline" className="border-dashed text-[10px] font-normal text-muted-foreground">
                                  {r.sample_warning.replace(/_/g, " ")}
                                </Badge>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ))}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Legacy scorecard preserved below the broader matrix */}
      <FeatureScorecard rows={readSection<MatrixRow>(data, "feature_scorecard")} baselineRate={baselineRate} />
    </div>
  );
}

// ---------- Technical Debug ----------

function TechnicalDebugTab({ data }: { data: ClaimHealthResponse }) {
  const baselineRate = data.baseline?.validation_rate;
  const baselinePct = rateToPct(baselineRate);
  return (
    <div className="space-y-6">
      <SurfaceHealth rows={readSection<MatrixRow>(data, "surface_matrix")} baselineRate={baselineRate} baselinePct={baselinePct} />
    </div>
  );
}




// (Legacy StatCard / SummaryCards removed — replaced by Overview tab cards.)


// ---------- Bar chart helper ----------

interface BarRow {
  name: string;
  rawName?: string;
  value: number;
  delta: number | null;
  claim_row_count?: number;
  game_count?: number;
  neutral?: number | null;
  small: boolean;
}

function buildBarRows(
  rows: MatrixRow[],
  baselineRate: unknown,
  nameKey: (r: MatrixRow) => string,
  rawNameKey?: (r: MatrixRow) => string,
): (BarRow & { rawValue: number | null })[] {
  return rows
    .map((r) => {
      const pct = rateToPct(r.validation_rate);
      return {
        name: nameKey(r) || "—",
        rawName: rawNameKey ? rawNameKey(r) : nameKey(r),
        value: pct ?? 0,
        rawValue: pct,
        delta: deltaVsBaseline(r.validation_rate, baselineRate),
        claim_row_count: r.claim_row_count,
        game_count: r.game_count,
        neutral: rateToPct(r.neutral_or_mixed_rate),
        small: isSmallSample(r),
      };
    })
    .filter((r) => r.rawValue !== null)
    .sort((a, b) => b.value - a.value);
}

function BarTooltip({ active, payload, baselinePct }: { active?: boolean; payload?: Array<{ payload: BarRow }>; baselinePct: number | null }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-md border border-border bg-background p-2 text-xs shadow-md">
      <div className="font-medium text-foreground">{r.name}</div>
      {r.rawName && r.rawName !== r.name && (
        <div className="text-[10px] text-muted-foreground">bucket: {r.rawName}</div>
      )}
      <div className="mt-1 space-y-0.5 text-muted-foreground">
        <div>Validation: <span className="text-foreground">{r.value.toFixed(1)}%</span></div>
        <div>Delta vs baseline: <span className={deltaClass(r.delta)}>{formatDelta(r.delta)}</span></div>
        {baselinePct !== null && <div>Baseline: {baselinePct.toFixed(1)}%</div>}
        <div>Claim rows: {r.claim_row_count ?? "—"} · Games: {r.game_count ?? "—"}</div>
        {r.neutral !== null && r.neutral !== undefined && <div>Neutral/mixed: {r.neutral.toFixed(1)}%</div>}
        {r.small && <div className="text-amber-500">small sample</div>}
      </div>
    </div>
  );
}

function HBarChart({ rows, baselineRate, yAxisWidth = 180 }: { rows: BarRow[]; baselineRate: unknown; yAxisWidth?: number }) {
  const baselinePct = rateToPct(baselineRate);
  const height = Math.max(160, rows.length * 32 + 40);
  if (!rows.length) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 56, left: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis type="category" dataKey="name" width={yAxisWidth} stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} tickFormatter={(v: string) => truncateLabel(v, yAxisWidth > 200 ? 36 : 28)} />
          <RTooltip content={<BarTooltip baselinePct={baselinePct} />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
          {baselinePct !== null && (
            <ReferenceLine x={baselinePct} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: `baseline ${baselinePct.toFixed(1)}%`, position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          )}
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="value"
              position="right"
              formatter={(v: number) => `${v.toFixed(1)}%`}
              fill="hsl(var(--foreground))"
              fontSize={11}
              offset={8}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ---------- Core Area ----------

function CoreAreaHealth({ rows, baselineRate }: { rows: MatrixRow[]; baselineRate: unknown }) {
  const bars = useMemo(() => buildBarRows(rows, baselineRate, (r) => r.core_area ?? ""), [rows, baselineRate]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Core Area Health</CardTitle>
        <CardDescription>Validation rate by core area, vs baseline.</CardDescription>
      </CardHeader>
      <CardContent>
        <HBarChart rows={bars} baselineRate={baselineRate} />
      </CardContent>
    </Card>
  );
}

// ---------- Feature Scorecard ----------

function FeatureScorecard({ rows, baselineRate }: { rows: MatrixRow[]; baselineRate: unknown }) {
  const bars = useMemo(
    () => buildBarRows(rows, baselineRate, (r) => {
      const raw = String(r.bucket ?? r.strength ?? "");
      return raw ? bucketToLabel(raw) : "Unknown bucket";
    }, (r) => String(r.bucket ?? r.strength ?? "")),
    [rows, baselineRate],
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Offensive Efficiency Feature Scorecard</CardTitle>
        <CardDescription>
          This feature is claim-language calibration support only. It does not drive winner prediction,
          Matchup Lean confidence, or Model Trust overrides.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <HBarChart rows={bars} baselineRate={baselineRate} yAxisWidth={240} />
      </CardContent>
    </Card>
  );
}

// ---------- Category Health Table ----------

function CategoryHealth({ rows, baselineRate, baselinePct }: { rows: MatrixRow[]; baselineRate: unknown; baselinePct: number | null }) {
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const ca = (a.core_area ?? "").localeCompare(b.core_area ?? "");
      if (ca !== 0) return ca;
      return (rateToPct(b.validation_rate) ?? -1) - (rateToPct(a.validation_rate) ?? -1);
    });
    return copy;
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Category Health</CardTitle>
        <CardDescription>
          Grouped by core area, sorted by validation rate.
          {baselinePct !== null && <> Baseline: <span className="font-mono">{baselinePct.toFixed(1)}%</span>.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Core Area</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Validation Rate</TableHead>
              <TableHead className="text-right">Delta vs Baseline</TableHead>
              <TableHead className="text-right">Claim Rows</TableHead>
              <TableHead className="text-right">Game Count</TableHead>
              <TableHead className="text-right">Neutral/Mixed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
            )}
            {sorted.map((r, i) => {
              const d = deltaVsBaseline(r.validation_rate, baselineRate);
              return (
                <TableRow key={`${r.core_area}-${r.category}-${i}`}>
                  <TableCell className="text-muted-foreground">{r.core_area ?? "—"}</TableCell>
                  <TableCell className="font-medium">
                    {r.category ?? "—"}
                    {isSmallSample(r) && <SmallSampleBadge />}
                  </TableCell>
                  <TableCell className="text-right font-mono">{formatPercent(r.validation_rate)}</TableCell>
                  <TableCell className={`text-right font-mono ${deltaClass(d)}`}>{formatDelta(d)}</TableCell>
                  <TableCell className="text-right font-mono">{r.claim_row_count ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.game_count ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatPercent(r.neutral_or_mixed_rate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ---------- Confidence Matrix ----------

type ConfBucket = { validation_rate?: number | null; claim_row_count?: number } | undefined;

function getConfBucket(row: ConfidenceMatrixRow, level: "high" | "medium" | "low"): ConfBucket {
  const direct = row[level] as ConfBucket;
  if (direct && typeof direct === "object") return direct;
  const vr = row[`${level}_validation_rate`];
  const cr = row[`${level}_claim_row_count`];
  if (vr !== undefined || cr !== undefined) {
    return { validation_rate: vr as number | null, claim_row_count: cr as number };
  }
  return undefined;
}

/**
 * Backend may return one of two shapes:
 *  - Pre-pivoted: one row per core_area with high/medium/low buckets
 *  - Flat: one row per (core_area, confidence) pair
 * Normalize to pre-pivoted rows keyed by core_area.
 */
function pivotConfidenceRows(rows: ConfidenceMatrixRow[]): ConfidenceMatrixRow[] {
  const byArea = new Map<string, ConfidenceMatrixRow>();

  for (const row of rows) {
    const area = (row.core_area as string | undefined)?.trim() || "—";
    const existing: ConfidenceMatrixRow = byArea.get(area) ?? { core_area: area };

    // Merge any already-pivoted buckets first.
    for (const level of ["high", "medium", "low"] as const) {
      const b = getConfBucket(row, level);
      if (b && existing[level] === undefined) existing[level] = b;
    }

    // Handle flat shape: { confidence: "High", validation_rate, claim_row_count }
    const conf = (row as { confidence?: unknown }).confidence;
    if (typeof conf === "string") {
      const key = conf.trim().toLowerCase();
      if (key === "high" || key === "medium" || key === "low") {
        (existing as Record<string, unknown>)[key] = {
          validation_rate: (row.validation_rate ?? null) as number | null,
          claim_row_count: row.claim_row_count,
        };
      }

    }

    byArea.set(area, existing);
  }

  return Array.from(byArea.values()).sort((a, b) =>
    String(a.core_area ?? "").localeCompare(String(b.core_area ?? "")),
  );
}

function ConfCell({ bucket }: { bucket?: { validation_rate?: number | null; claim_row_count?: number } }) {
  if (!bucket || (bucket.validation_rate == null && bucket.claim_row_count == null)) {
    return <span className="text-muted-foreground">—</span>;
  }
  const small = (bucket.claim_row_count ?? 0) < 30;
  return (
    <div className="flex items-baseline justify-end gap-2">
      <span className="font-mono">{formatPercent(bucket.validation_rate)}</span>
      <span className="text-xs text-muted-foreground">
        n={bucket.claim_row_count ?? "—"}
        {small && bucket.claim_row_count !== undefined && " *"}
      </span>
    </div>
  );
}

function ConfidenceMatrix({ rows }: { rows: ConfidenceMatrixRow[] }) {
  const pivoted = useMemo(() => pivotConfidenceRows(rows), [rows]);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Confidence by Core Area</CardTitle>
        <CardDescription>Validation rate split by stated confidence level. * indicates small sample.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Core Area</TableHead>
              <TableHead className="text-right">High</TableHead>
              <TableHead className="text-right">Medium</TableHead>
              <TableHead className="text-right">Low</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pivoted.length === 0 && (
              <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
            )}
            {pivoted.map((r, i) => (
              <TableRow key={`${r.core_area}-${i}`}>
                <TableCell className="font-medium">{(r.core_area as string) ?? "—"}</TableCell>
                <TableCell className="text-right"><ConfCell bucket={getConfBucket(r, "high")} /></TableCell>
                <TableCell className="text-right"><ConfCell bucket={getConfBucket(r, "medium")} /></TableCell>
                <TableCell className="text-right"><ConfCell bucket={getConfBucket(r, "low")} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


// ---------- Surface Health ----------

function SurfaceHealth({ rows, baselineRate, baselinePct }: { rows: MatrixRow[]; baselineRate: unknown; baselinePct: number | null }) {
  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => (rateToPct(b.validation_rate) ?? -1) - (rateToPct(a.validation_rate) ?? -1));
    return copy;
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Claim Surface Health</CardTitle>
        <CardDescription>
          Validation rate by claim type and layer.
          {baselinePct !== null && <> Baseline: <span className="font-mono">{baselinePct.toFixed(1)}%</span>.</>}
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Claim Type</TableHead>
              <TableHead>Claim Layer</TableHead>
              <TableHead className="text-right">Validation Rate</TableHead>
              <TableHead className="text-right">Delta vs Baseline</TableHead>
              <TableHead className="text-right">Claim Rows</TableHead>
              <TableHead className="text-right">Game Count</TableHead>
              <TableHead className="text-right">Neutral/Mixed</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground">No data.</TableCell></TableRow>
            )}
            {sorted.map((r, i) => {
              const d = deltaVsBaseline(r.validation_rate, baselineRate);
              return (
                <TableRow key={`${r.claim_type}-${r.claim_layer}-${i}`}>
                  <TableCell className="font-medium">
                    {r.claim_type ?? "—"}
                    {isSmallSample(r) && <SmallSampleBadge />}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{r.claim_layer ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatPercent(r.validation_rate)}</TableCell>
                  <TableCell className={`text-right font-mono ${deltaClass(d)}`}>{formatDelta(d)}</TableCell>
                  <TableCell className="text-right font-mono">{r.claim_row_count ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{r.game_count ?? "—"}</TableCell>
                  <TableCell className="text-right font-mono">{formatPercent(r.neutral_or_mixed_rate)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
