import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  ExternalLink,
  Flame,
  Wind,
  Scale,
  AlertTriangle,
  Activity,
  Swords,
  Check,
  X,
  Minus,
  type LucideIcon,
} from "lucide-react";
import { useGameDetails, type GameDetails } from "@/lib/nfl-api";
import { getTeam, teamLogoUrl, type TeamMeta } from "@/lib/nfl-teams";

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type SignalLevel = "Low" | "Moderate" | "Elevated" | "High";

const LEVEL_STEPS: Record<string, number> = {
  Low: 1,
  Moderate: 2,
  Elevated: 3,
  High: 4,
};
const LEVEL_COLOR: Record<string, string> = {
  Low: "text-level-low",
  Moderate: "text-level-moderate",
  Elevated: "text-level-elevated",
  High: "text-level-high",
};
const LEVEL_BAR: Record<string, string> = {
  Low: "bg-level-low/70",
  Moderate: "bg-level-moderate/80",
  Elevated: "bg-level-elevated/85",
  High: "bg-level-high/85",
};

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Pressure: Flame,
  "Pass Environment": Wind,
  "Control Path": Scale,
  "Turnover Environment": AlertTriangle,
  "Turnover": AlertTriangle,
  Volatility: Activity,
  Scoring: Flame,
};

function iconForCategory(cat: string): LucideIcon {
  if (CATEGORY_ICONS[cat]) return CATEGORY_ICONS[cat];
  const key = Object.keys(CATEGORY_ICONS).find((k) =>
    cat.toLowerCase().includes(k.toLowerCase()),
  );
  return key ? CATEGORY_ICONS[key] : Activity;
}

function formatNumber(n: number, label: string): string {
  // If between -1 and 1 (excl. small ints) treat as ratio/% maybe
  if (label.toLowerCase().includes("%") || label.toLowerCase().includes("rate") || label.toLowerCase().includes("pct")) {
    return `${(n * 100).toFixed(1)}%`;
  }
  // values that look like rates (|n| < 2) => 3 decimals; else 2
  if (Math.abs(n) < 2) return n.toFixed(3);
  return n.toFixed(2);
}

function isFinal(status?: string) {
  return !!status && /final/i.test(status);
}

function teamFromApi(t: GameDetails["header"]["away_team"]): TeamMeta {
  // Prefer our local metadata for nicer display names; fall back to API.
  const local = getTeam(t.abbreviation);
  if (local && local.abbr === t.abbreviation) return local;
  return {
    abbr: t.abbreviation,
    shortName: t.name,
    fullName: t.name,
    location: "",
    espnId: t.abbreviation.toLowerCase(),
  };
}

// ─────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────

function TeamLogo({
  team,
  fallbackLogo,
  size = 40,
}: {
  team: TeamMeta;
  fallbackLogo?: string;
  size?: number;
}) {
  const src = teamLogoUrl(team.abbr, 500) || fallbackLogo;
  return (
    <img
      src={src}
      alt={`${team.fullName} logo`}
      width={size}
      height={size}
      loading="lazy"
      className="object-contain"
      style={{ width: size, height: size }}
      onError={(e) => {
        const img = e.currentTarget as HTMLImageElement;
        if (fallbackLogo && img.src !== fallbackLogo) {
          img.src = fallbackLogo;
        } else {
          img.style.visibility = "hidden";
        }
      }}
    />
  );
}

function Badge({
  children,
  variant = "default",
}: {
  children: React.ReactNode;
  variant?: "default" | "muted" | "accent" | "warm";
}) {
  const cls =
    variant === "warm"
      ? "border-accent-warm/30 bg-accent-warm/10 text-accent-warm"
      : variant === "accent"
      ? "border-primary/30 bg-primary/10 text-primary"
      : variant === "muted"
      ? "border-border/50 text-muted-foreground/60"
      : "border-border text-muted-foreground";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${cls}`}
    >
      {children}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Final score
// ─────────────────────────────────────────────────────────────

function FinalScoreCard({
  away,
  home,
  awayLogo,
  homeLogo,
  score,
  status,
}: {
  away: TeamMeta;
  home: TeamMeta;
  awayLogo?: string;
  homeLogo?: string;
  score: NonNullable<GameDetails["final_score"]>;
  status: string;
}) {
  const hasOt = (score.away.ot ?? 0) > 0 || (score.home.ot ?? 0) > 0;
  const cols: Array<{ key: string; label: string; awayVal: number; homeVal: number }> = [
    { key: "q1", label: "Q1", awayVal: score.away.q1, homeVal: score.home.q1 },
    { key: "q2", label: "Q2", awayVal: score.away.q2, homeVal: score.home.q2 },
    { key: "q3", label: "Q3", awayVal: score.away.q3, homeVal: score.home.q3 },
    { key: "q4", label: "Q4", awayVal: score.away.q4, homeVal: score.home.q4 },
  ];
  if (hasOt) {
    cols.push({ key: "ot", label: "OT", awayVal: score.away.ot ?? 0, homeVal: score.home.ot ?? 0 });
  }

  const awayWon = score.away.total > score.home.total;
  const homeWon = score.home.total > score.away.total;

  const gridStyle = { ["--cols" as any]: cols.length } as React.CSSProperties;
  const gridClass = "grid grid-cols-[1fr_repeat(var(--cols),2.5rem)_4rem] items-center gap-x-2";

  const TeamRow = ({
    team,
    logo,
    perQuarter,
    total,
    winner,
  }: {
    team: TeamMeta;
    logo?: string;
    perQuarter: number[];
    total: number;
    winner: boolean;
  }) => (
    <div className={`${gridClass} group rounded-md px-2 py-2.5 transition-colors hover:bg-muted/30`} style={gridStyle}>
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo team={team} fallbackLogo={logo} size={28} />
        <div className="min-w-0">
          <p className={`truncate text-sm font-semibold ${winner ? "text-foreground" : "text-foreground/75"}`}>
            {team.location ? `${team.location} ` : ""}
            <span className="text-foreground/90">{team.shortName}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">{team.abbr}</p>
        </div>
      </div>
      {perQuarter.map((v, i) => (
        <span key={i} className="text-center font-mono text-sm tabular-nums text-foreground/70">
          {v}
        </span>
      ))}
      <span
        className={`text-right font-mono tabular-nums ${
          winner ? "text-2xl font-bold text-foreground" : "text-2xl font-semibold text-foreground/55"
        }`}
      >
        {total}
      </span>
    </div>
  );

  return (
    <Card className="mb-6 border-border bg-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            <h3 className="text-sm font-semibold text-foreground">Final Score</h3>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">{status}</span>
        </div>

        <div
          className={`${gridClass} border-b border-border/50 px-2 pb-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60`}
          style={gridStyle}
        >
          <span>Team</span>
          {cols.map((c) => (
            <span key={c.key} className="text-center">
              {c.label}
            </span>
          ))}
          <span className="text-right">Total</span>
        </div>

        <div className="divide-y divide-border/30">
          <TeamRow team={away} logo={awayLogo} perQuarter={cols.map((c) => c.awayVal)} total={score.away.total} winner={awayWon} />
          <TeamRow team={home} logo={homeLogo} perQuarter={cols.map((c) => c.homeVal)} total={score.home.total} winner={homeWon} />
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Model Outcome
// ─────────────────────────────────────────────────────────────

function ModelOutcomeCard({
  outcome,
}: {
  outcome: NonNullable<GameDetails["model_outcome"]>;
}) {
  const result = outcome.result;
  const isCorrect = /correct/i.test(result) && !/incorrect/i.test(result);
  const isIncorrect = /incorrect/i.test(result);
  const isNoPick = /no pick/i.test(result) || (!isCorrect && !isIncorrect);

  const tone = isCorrect
    ? {
        Icon: Check,
        topBorder: "border-t-success",
        text: "text-success",
        chipBg: "bg-success/20 dark:bg-success/25",
        chipBorder: "border-success/55",
        ring: "ring-success/25",
        label: "Model prediction matched game result",
      }
    : isIncorrect
    ? {
        Icon: X,
        topBorder: "border-t-destructive",
        text: "text-destructive",
        chipBg: "bg-destructive/20 dark:bg-destructive/25",
        chipBorder: "border-destructive/55",
        ring: "ring-destructive/25",
        label: "Model prediction missed game result",
      }
    : {
        Icon: Minus,
        topBorder: "border-t-muted-foreground/40",
        text: "text-muted-foreground",
        chipBg: "bg-muted/50",
        chipBorder: "border-border",
        ring: "ring-border",
        label: "No model pick for this matchup",
      };

  const Icon = tone.Icon;

  return (
    <Card className={`mb-6 border-border bg-card border-t-[3px] ${tone.topBorder}`}>
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Prediction Result</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Result Check
          </span>
        </div>

        <div className="flex flex-col items-center text-center">
          <div
            className={`flex items-center gap-2 rounded-full border px-3.5 py-1.5 ${tone.chipBg} ${tone.chipBorder} ring-1 ${tone.ring}`}
          >
            <Icon className={`h-[18px] w-[18px] ${tone.text}`} strokeWidth={2.5} aria-hidden="true" />
            <span className={`text-lg font-bold tracking-tight ${tone.text}`}>{result}</span>
          </div>

          <p className="mt-2.5 text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">
            {tone.label}
          </p>

          {!isNoPick && (
            <>
              <div className="mt-4 h-px w-16 bg-border/70" />
              <div className="mt-4 flex items-center gap-4 text-[12px]">
                <span>
                  <span className="font-medium text-muted-foreground/70">Predicted:</span>{" "}
                  <span className="font-bold tracking-tight text-foreground">
                    {outcome.predicted_team ?? "—"}
                  </span>
                </span>
                <span className="h-3 w-px bg-border" />
                <span>
                  <span className="font-medium text-muted-foreground/70">Winner:</span>{" "}
                  <span className="font-bold tracking-tight text-foreground">
                    {outcome.actual_winner ?? "—"}
                  </span>
                </span>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Matchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading, isError, error } = useGameDetails(id);

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-8 gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => {
            const search = new URLSearchParams(location.search);
            const stateDate = (location.state as { fromDate?: string } | null)?.fromDate;
            const date = search.get("date") || stateDate;
            navigate(date ? `/?date=${date}` : "/");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to games
        </Button>

        {isLoading && (
          <div className="space-y-4">
            <div className="h-20 animate-pulse rounded-md bg-muted/40" />
            <div className="h-32 animate-pulse rounded-md bg-muted/40" />
            <div className="h-48 animate-pulse rounded-md bg-muted/40" />
          </div>
        )}

        {isError && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-destructive">Couldn't load this game</p>
              <p className="mt-1 text-xs text-muted-foreground">{(error as Error)?.message}</p>
            </CardContent>
          </Card>
        )}

        {data && <MatchupContent details={data} routeId={id} />}
      </div>
    </AppShell>
  );
}

function MatchupContent({ details, routeId }: { details: GameDetails; routeId?: string }) {
  const { header, final_score, game_profile, matchup_lean, team_comparison } = details;
  const awayTeam = teamFromApi(header.away_team);
  const homeTeam = teamFromApi(header.home_team);
  const showStatus = header.game_status && header.game_status !== "Scheduled";
  // Render final score whenever the API returns it — trust the backend.
  const hasFinalScore = !!final_score;

  return (
    <>
      {/* ── Header ── */}
      <div className="mb-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3">
            <TeamLogo team={awayTeam} fallbackLogo={header.away_team.logo} size={44} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                {awayTeam.abbr} · Away
              </p>
              <p className="text-base font-semibold text-foreground">{awayTeam.fullName}</p>
            </div>
          </div>
          <span className="px-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">at</span>
          <div className="flex items-center gap-3">
            <TeamLogo team={homeTeam} fallbackLogo={header.home_team.logo} size={44} />
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                {homeTeam.abbr} · Home
              </p>
              <p className="text-base font-semibold text-foreground">{homeTeam.fullName}</p>
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {header.game_date}
            {header.game_time ? ` · ${header.game_time}` : ""}
          </span>
          {header.game_week && <Badge variant="warm">{header.game_week}</Badge>}
          {showStatus && <Badge variant="accent">{header.game_status}</Badge>}
          <Badge variant="muted">ID {routeId ?? header.game_id}</Badge>
          {header.espn_link && (
            <a
              href={header.espn_link}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
            >
              View on ESPN
              <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
        <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">Understand the matchup</p>
      </div>

      {/* ── Final Score ── */}
      {hasFinalScore && final_score && (
        <FinalScoreCard
          away={awayTeam}
          home={homeTeam}
          awayLogo={header.away_team.logo}
          homeLogo={header.home_team.logo}
          score={final_score}
          status={header.game_status}
        />
      )}

      {/* ── Game Profile ── */}
      {game_profile && game_profile.length > 0 && (
        <Card className="mb-6 border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Game Profile</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">Signals</span>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {game_profile.map((row) => {
                const Icon = iconForCategory(row.category);
                const steps = LEVEL_STEPS[row.level] ?? 2;
                const colorCls = LEVEL_COLOR[row.level] ?? "text-foreground";
                const barCls = LEVEL_BAR[row.level] ?? "bg-muted-foreground/60";
                return (
                  <div
                    key={row.category}
                    className="group border-l-2 border-border pl-3 transition-[border-color,border-width,padding] duration-150 hover:border-l-[3px] hover:border-muted-foreground/50 hover:pl-[11px]"
                  >
                    <div className="flex items-center gap-1.5">
                      <Icon
                        className="h-3.5 w-3.5 text-muted-foreground/70 transition-colors duration-150 group-hover:text-foreground/80"
                        strokeWidth={2}
                        aria-hidden="true"
                      />
                      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-foreground/80">
                        {row.category}
                      </p>
                    </div>
                    <p
                      className={`mt-1.5 text-xl font-semibold leading-tight tracking-tight transition-colors duration-150 ${colorCls}`}
                    >
                      {row.level}
                    </p>
                    <div className="mt-2 flex gap-1" role="img" aria-label={`${row.level} (${steps} of 4)`}>
                      {[1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-[3px] w-5 rounded-full transition-colors ${
                            i <= steps ? barCls : "bg-muted-foreground/20 dark:bg-muted-foreground/15"
                          }`}
                        />
                      ))}
                    </div>
                    {row.tilt && (
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground/55">
                        <span className="font-medium text-muted-foreground/75">Tilt:</span> {row.tilt}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Matchup Lean ── */}
      {matchup_lean && (
        <Card className="mb-6 border-border bg-card border-t-[3px] border-t-accent-cool shadow-[0_0_0_1px_hsl(var(--accent-cool)/0.08)] dark:border-t-accent-cool">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Matchup Lean</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Decision Support
              </span>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1 space-y-2">
                {matchup_lean.target_team && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                      Target
                    </span>
                    <span className="inline-flex items-center rounded-md border border-accent-cool/50 bg-accent-cool/15 px-2.5 py-1 text-sm font-bold tracking-tight text-foreground shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.15)]">
                      {matchup_lean.target_team}
                    </span>
                  </div>
                )}
                {matchup_lean.lean_summary && (
                  <p className="text-base font-semibold leading-snug text-foreground">
                    {matchup_lean.lean_summary}
                  </p>
                )}
                {matchup_lean.focus_summary && (
                  <p className="text-[13px] leading-snug text-muted-foreground/80">
                    {matchup_lean.focus_summary}
                  </p>
                )}
              </div>
              {matchup_lean.confidence && (
                <div className="flex shrink-0 items-center gap-2 sm:pt-0.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                    Confidence
                  </span>
                  <span className="rounded-full border border-accent-cool/40 bg-accent-cool/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
                    {matchup_lean.confidence}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Model Outcome ── */}
      {details.model_outcome && <ModelOutcomeCard outcome={details.model_outcome} />}

      {/* ── Team Comparison ── */}
      {team_comparison && team_comparison.length > 0 && (
        <Card className="mb-10 border-border/80 bg-gradient-to-b from-card to-card/60 shadow-[0_1px_0_0_hsl(var(--border)/0.6),0_20px_40px_-24px_hsl(var(--primary)/0.18)] ring-1 ring-border/40">
          <CardContent className="p-7 sm:p-8">
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                  <Swords className="h-4 w-4 text-primary" />
                </div>
                <h2 className="text-lg font-semibold leading-tight text-foreground">Team Comparison</h2>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Season averages
              </span>
            </div>

            {/* Team header row */}
            <div className="mb-4 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2.5">
                <TeamLogo team={awayTeam} fallbackLogo={header.away_team.logo} size={22} />
                <span className="text-sm font-semibold tracking-tight text-foreground">{awayTeam.shortName}</span>
              </div>
              <span className="px-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
                vs
              </span>
              <div className="flex items-center justify-end gap-2.5">
                <span className="text-sm font-semibold tracking-tight text-foreground">{homeTeam.shortName}</span>
                <TeamLogo team={homeTeam} fallbackLogo={header.home_team.logo} size={22} />
              </div>
            </div>

            <div className="space-y-1">
              {team_comparison.map((r) => {
                const adv = r.better as "away" | "home" | "even";
                const valueCls = (side: "away" | "home") =>
                  adv === side
                    ? "text-foreground font-semibold"
                    : adv === "even"
                    ? "text-foreground/75"
                    : "text-foreground/45";
                return (
                  <div
                    key={r.label}
                    className="-mx-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-md px-2 py-3 transition-all duration-150 hover:bg-muted/40 hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.12)] dark:hover:bg-muted/40 dark:hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.32)]"
                  >
                    <span className={`text-left font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("away")}`}>
                      {formatNumber(r.away, r.label)}
                    </span>
                    <span className="px-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {r.label}
                    </span>
                    <span className={`text-right font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("home")}`}>
                      {formatNumber(r.home, r.label)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
