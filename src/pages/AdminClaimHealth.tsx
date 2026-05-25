import { Component, useMemo, type ErrorInfo, type ReactNode } from "react";
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
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useClaimHealth, type ClaimHealthResponse, type MatrixRow, type ConfidenceMatrixRow } from "@/lib/admin-api";
import { ApiError } from "@/lib/nfl-api";

const RUN_ID = "full_2025_reg_post_claim_matrix_pilot";
const SEASON = "2025";

// ---------- Helpers ----------

const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

function formatPercent(value: unknown): string {
  if (!isNum(value)) return "—";
  const pct = Math.abs(value) <= 1.5 ? value * 100 : value;
  return `${pct.toFixed(1)}%`;
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

function deltaClass(delta: number | null): string {
  if (delta === null) return "text-muted-foreground";
  if (delta >= 0.5) return "text-emerald-500";
  if (delta <= -0.5) return "text-rose-500";
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
function readSection<T = MatrixRow | ConfidenceMatrixRow>(
  data: ClaimHealthResponse | undefined,
  key: "core_area_matrix" | "category_matrix" | "confidence_core_area_matrix" | "feature_scorecard" | "surface_matrix",
): T[] {
  if (!data) return [];
  const nested = (data.sections as Record<string, unknown> | undefined)?.[key];
  if (Array.isArray(nested)) return nested as T[];
  const flat = (data as unknown as Record<string, unknown>)[key];
  if (Array.isArray(flat)) return flat as T[];
  return [];
}

export default function AdminClaimHealth() {
  const { data, isLoading, isFetching, error } = useClaimHealth(RUN_ID, SEASON);

  return (
    <AppShell showGuide={false}>
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Admin Claim Health</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Aggregate claim-validation health. This measures whether GameLens claims were supported by
            postgame data, not whether the predicted team won.
          </p>
          {data && (
            <div className="flex flex-wrap gap-x-6 gap-y-1 pt-2 text-xs text-muted-foreground">
              {data.run_id && <span>run_id: <span className="font-mono text-foreground/80">{data.run_id}</span></span>}
              {data.season !== undefined && <span>season: <span className="font-mono text-foreground/80">{String(data.season)}</span></span>}
              {data.generated_at && <span>generated_at: <span className="font-mono text-foreground/80">{data.generated_at}</span></span>}
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

          {data && <Sections data={data} />}

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

function Sections({ data }: { data: ClaimHealthResponse }) {
  const baselineRate = data.baseline?.validation_rate;
  const baselinePct = rateToPct(baselineRate);

  return (
    <TooltipProvider delayDuration={150}>
      <SummaryCards data={data} />
      <CoreAreaHealth rows={readSection<MatrixRow>(data, "core_area_matrix")} baselineRate={baselineRate} />
      <FeatureScorecard rows={readSection<MatrixRow>(data, "feature_scorecard")} baselineRate={baselineRate} />
      <CategoryHealth rows={readSection<MatrixRow>(data, "category_matrix")} baselineRate={baselineRate} baselinePct={baselinePct} />
      <ConfidenceMatrix rows={readSection<ConfidenceMatrixRow>(data, "confidence_core_area_matrix")} />
      <SurfaceHealth rows={readSection<MatrixRow>(data, "surface_matrix")} baselineRate={baselineRate} baselinePct={baselinePct} />
    </TooltipProvider>
  );
}


// ---------- Summary cards ----------

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

function SummaryCards({ data }: { data: ClaimHealthResponse }) {
  const cov = data.coverage ?? {};
  const base = data.baseline ?? {};
  const games = cov.games_with_claims;
  const expected = cov.expected_games;
  const coverageStr = isNum(games) && isNum(expected) && expected > 0
    ? `${games} / ${expected}`
    : "—";
  const coveragePct = isNum(games) && isNum(expected) && expected > 0
    ? ` (${((games / expected) * 100).toFixed(1)}%)`
    : "";

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard
        label="Coverage"
        value={<span>{coverageStr}<span className="ml-1 text-sm font-normal text-muted-foreground">{coveragePct}</span></span>}
        note={cov.context_note}
      />
      <StatCard label="No-claim games" value={isNum(cov.games_without_claims) ? cov.games_without_claims : "—"} />
      <StatCard label="Baseline validation rate" value={formatPercent(base.validation_rate)} />
      <StatCard label="Claim rows" value={isNum(cov.claim_row_count ?? base.claim_row_count) ? (cov.claim_row_count ?? base.claim_row_count) : "—"} />
      <StatCard label="Neutral / mixed rate" value={formatPercent(cov.neutral_or_mixed_rate ?? base.neutral_or_mixed_rate)} />
    </section>
  );
}

// ---------- Bar chart helper ----------

interface BarRow {
  name: string;
  value: number;
  delta: number | null;
  claim_row_count?: number;
  game_count?: number;
  neutral?: number | null;
  small: boolean;
}

function buildBarRows(rows: MatrixRow[], baselineRate: unknown, nameKey: (r: MatrixRow) => string): BarRow[] {
  return rows
    .map((r) => {
      const pct = rateToPct(r.validation_rate);
      return {
        name: nameKey(r) || "—",
        value: pct ?? 0,
        rawValue: pct,
        delta: deltaVsBaseline(r.validation_rate, baselineRate),
        claim_row_count: r.claim_row_count,
        game_count: r.game_count,
        neutral: rateToPct(r.neutral_or_mixed_rate),
        small: isSmallSample(r),
      } as BarRow & { rawValue: number | null };
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

function HBarChart({ rows, baselineRate }: { rows: BarRow[]; baselineRate: unknown }) {
  const baselinePct = rateToPct(baselineRate);
  const height = Math.max(160, rows.length * 32 + 40);
  if (!rows.length) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No data.</div>;
  }
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={rows} layout="vertical" margin={{ top: 8, right: 24, left: 8, bottom: 8 }}>
          <CartesianGrid horizontal={false} stroke="hsl(var(--border))" strokeOpacity={0.4} />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="hsl(var(--muted-foreground))" fontSize={11} />
          <YAxis type="category" dataKey="name" width={180} stroke="hsl(var(--muted-foreground))" fontSize={11} interval={0} />
          <RTooltip content={<BarTooltip baselinePct={baselinePct} />} cursor={{ fill: "hsl(var(--muted) / 0.3)" }} />
          {baselinePct !== null && (
            <ReferenceLine x={baselinePct} stroke="hsl(var(--muted-foreground))" strokeDasharray="3 3" label={{ value: `baseline ${baselinePct.toFixed(1)}%`, position: "top", fill: "hsl(var(--muted-foreground))", fontSize: 10 }} />
          )}
          <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
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
    () => buildBarRows(rows, baselineRate, (r) => r.label ?? r.feature ?? r.category ?? ""),
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
        <HBarChart rows={bars} baselineRate={baselineRate} />
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
