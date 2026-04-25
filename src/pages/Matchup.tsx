import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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
  ChevronDown,
  ShieldCheck,
  Info,
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
// Model Trust & Outcome
// ─────────────────────────────────────────────────────────────

type ConfidenceTier = "high" | "medium" | "low" | "unknown";

function classifyConfidence(c?: string | null): ConfidenceTier {
  if (!c) return "unknown";
  const v = c.toLowerCase();
  if (v.includes("high")) return "high";
  if (v.includes("med")) return "medium";
  if (v.includes("low")) return "low";
  return "unknown";
}

const CONFIDENCE_STYLE: Record<ConfidenceTier, { dot: string; text: string; bg: string; border: string }> = {
  high:    { dot: "bg-success",                 text: "text-success",            bg: "bg-success/10",            border: "border-success/40" },
  medium:  { dot: "bg-level-elevated",          text: "text-level-elevated",     bg: "bg-level-elevated/10",     border: "border-level-elevated/40" },
  low:     { dot: "bg-destructive",             text: "text-destructive",        bg: "bg-destructive/10",        border: "border-destructive/40" },
  unknown: { dot: "bg-muted-foreground/50",     text: "text-muted-foreground",   bg: "bg-muted/40",              border: "border-border" },
};

function ModelTrustCard({
  outcome,
  lean,
  teamComparison,
  gameProfile,
  awayTeam,
  homeTeam,
}: {
  outcome: NonNullable<GameDetails["model_outcome"]>;
  lean: GameDetails["matchup_lean"];
  teamComparison: GameDetails["team_comparison"];
  gameProfile: GameDetails["game_profile"];
  awayTeam: TeamMeta;
  homeTeam: TeamMeta;
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
        glow: "shadow-[0_0_28px_-8px_hsl(var(--success)/0.55)]",
        label: "Model prediction matched game result",
        learningTag: "Model aligned with outcome",
        learningIcon: Check,
        learningBg: "bg-success/10 border-success/40 text-success",
      }
    : isIncorrect
    ? {
        Icon: X,
        topBorder: "border-t-destructive",
        text: "text-destructive",
        chipBg: "bg-destructive/20 dark:bg-destructive/25",
        chipBorder: "border-destructive/55",
        ring: "ring-destructive/25",
        glow: "shadow-[0_0_28px_-8px_hsl(var(--destructive)/0.55)]",
        label: "Model prediction missed game result",
        learningTag: "Model miss — review signals",
        learningIcon: AlertTriangle,
        learningBg: "bg-destructive/10 border-destructive/40 text-destructive",
      }
    : {
        Icon: Minus,
        topBorder: "border-t-muted-foreground/40",
        text: "text-muted-foreground",
        chipBg: "bg-muted/50",
        chipBorder: "border-border",
        ring: "ring-border",
        glow: "",
        label: "No model pick for this matchup",
        learningTag: "Neutral — model avoided low-confidence scenario",
        learningIcon: Minus,
        learningBg: "bg-muted/40 border-border text-muted-foreground",
      };

  const Icon = tone.Icon;
  const LearningIcon = tone.learningIcon;

  // ── Matchup Advantage: combines team_comparison wins + game_profile signal weighting.
  const predicted = outcome.predicted_team ?? lean?.target_team ?? null;
  const actual = outcome.actual_winner ?? null;

  const compWins = { away: 0, home: 0 };
  (teamComparison ?? []).forEach((r) => {
    if (r.better === "away") compWins.away += 1;
    else if (r.better === "home") compWins.home += 1;
  });

  // Signal strength weighting from game_profile levels
  const signalScore = (gameProfile ?? []).reduce(
    (acc, row) => acc + (LEVEL_STEPS[row.level] ?? 0),
    0,
  );
  const awayPts = compWins.away;
  const homePts = compWins.home;
  const maxPts = Math.max(awayPts, homePts, 1);
  const totalMetrics = (teamComparison ?? []).length;
  const decidedMetrics = awayPts + homePts;
  const winnerPts = Math.max(awayPts, homePts);
  const winnerSide: "away" | "home" | null =
    awayPts === homePts ? null : awayPts > homePts ? "away" : "home";
  const winnerTeam = winnerSide === "away" ? awayTeam : winnerSide === "home" ? homeTeam : null;

  // Edge strength bucketing — based on metric win differential
  const winDiff = Math.abs(awayPts - homePts);
  const edgeStrength: "Strong" | "Moderate" | "Low" =
    winDiff >= 3 ? "Strong" : winDiff >= 2 ? "Moderate" : "Low";

  // Signal counts by level for the friendly summary
  const elevatedCount = (gameProfile ?? []).filter((r) => r.level === "Elevated" || r.level === "High").length;
  const moderateCount = (gameProfile ?? []).filter((r) => r.level === "Moderate").length;

  // Resolve a readable team name from a side ("away" | "home")
  const sideToTeam = (side: string): TeamMeta | null => {
    if (side === "away") return awayTeam;
    if (side === "home") return homeTeam;
    return null;
  };

  // Reasons (Why the model picked this) — top metric edges + top signal
  const topComparisons = (teamComparison ?? [])
    .filter((r) => r.better === "away" || r.better === "home")
    .slice(0, 2);
  const topProfile = (gameProfile ?? [])
    .slice()
    .sort((a, b) => (LEVEL_STEPS[b.level] ?? 0) - (LEVEL_STEPS[a.level] ?? 0))[0];
  const topProfileTeam = topProfile ? (winnerTeam ?? null) : null;

  const tier = classifyConfidence(lean?.confidence);
  const confStyle = CONFIDENCE_STYLE[tier];

  return (
    <Card className={`mb-6 border-border bg-card border-t-[3px] ${tone.topBorder}`}>
      <CardContent className="p-5">
        {/* Header */}
        <div className="mb-5 flex items-baseline gap-2">
          <ShieldCheck className="h-4 w-4 self-center text-muted-foreground/70" strokeWidth={2} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Model Trust &amp; Outcome</h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/40">
            Should I trust this model?
          </span>
        </div>

        {/* 1. Result Badge */}
        <div className="mx-auto flex w-full flex-col items-center text-center">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 ${tone.chipBg} ${tone.chipBorder} ring-1 ${tone.ring} ${tone.glow}`}
          >
            <Icon className={`h-[18px] w-[18px] ${tone.text}`} strokeWidth={2.75} aria-hidden="true" />
            <span className={`text-lg font-bold leading-none tracking-tight ${tone.text}`}>{result}</span>
          </div>
          <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            {tone.label}
          </p>
        </div>

        {/* 2. Prediction Summary */}
        {!isNoPick && (predicted || actual) && (
          <div className="mt-5 flex items-stretch justify-center gap-3">
            <PredictionPill label="Predicted" team={predicted} match={isCorrect ? "match" : "miss"} />
            <span className="self-center text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
              vs
            </span>
            <PredictionPill label="Actual" team={actual} match={isCorrect ? "match" : "neutral"} />
          </div>
        )}

        {/* 3. Confidence Block */}
        {lean?.confidence && (
          <div className="mt-6 rounded-md border border-border/70 bg-muted/20 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                Confidence
              </span>
              <InfoTip label={confidenceTooltip(lean.confidence)}>
                <span
                  className={`inline-flex cursor-help items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${confStyle.bg} ${confStyle.border} ${confStyle.text}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${confStyle.dot}`} />
                  {lean.confidence}
                </span>
              </InfoTip>
            </div>
            {lean.confidence_context && (
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-accent-warm">
                <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" strokeWidth={2.25} />
                <span>{lean.confidence_context}</span>
              </p>
            )}
          </div>
        )}

        {/* 4. Matchup Advantage */}
        {(awayPts > 0 || homePts > 0) && teamComparison && teamComparison.length > 0 && (
          <div className="mt-6">
            <div className="mb-2 flex items-center justify-between">
              <InfoTip label="Shows how many matchup factors favored each team across stats and key signals.">
                <span className="cursor-help text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70 underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                  Matchup Advantage
                </span>
              </InfoTip>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/50">
                Relative matchup strength
              </span>
            </div>
            <div className="space-y-2">
              <EdgeBar
                label={`${awayTeam.abbr} Advantage`}
                value={awayPts}
                max={maxPts}
                tooltip={`Number of matchup factors that favored the ${awayTeam.shortName}.`}
              />
              <EdgeBar
                label={`${homeTeam.abbr} Advantage`}
                value={homePts}
                max={maxPts}
                tooltip={`Number of matchup factors that favored the ${homeTeam.shortName}.`}
              />
            </div>
          </div>
        )}

        {/* 5. Why the model picked this */}
        {(topComparisons.length > 0 || topProfile) && (
          <div className="mt-6">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Why the model picked this
            </p>
            <ul className="space-y-1.5 text-[12.5px] leading-snug text-foreground/85">
              {topComparisons.map((r) => {
                const team = sideToTeam(r.better);
                const teamName = team?.shortName ?? "Team";
                const tip = formatStatGap(r.away, r.home);
                const row = (
                  <span className={tip ? "cursor-help" : undefined}>
                    <span className="font-semibold text-foreground">{teamName}</span> held the edge in{" "}
                    <span className="text-foreground">{r.label.toLowerCase()}</span>
                  </span>
                );
                return (
                  <li key={r.label} className="flex gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-cool" />
                    {tip ? <InfoTip label={tip}>{row}</InfoTip> : row}
                  </li>
                );
              })}
              {topProfile && (
                <li className="flex gap-2">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-accent-cool" />
                  <span>
                    {topProfileTeam ? (
                      <>
                        <span className="font-semibold text-foreground">{topProfileTeam.shortName}</span>{" "}
                        had the stronger {topProfile.category.toLowerCase()} profile
                      </>
                    ) : (
                      <>Stronger {topProfile.category.toLowerCase()} profile detected</>
                    )}
                  </span>
                </li>
              )}
            </ul>
          </div>
        )}

        {/* 6. Model Learning Tag */}
        <div className="mt-6 flex justify-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${tone.learningBg}`}>
            <LearningIcon className="h-3 w-3" strokeWidth={2.5} />
            {tone.learningTag}
          </span>
        </div>

        {/* Optional: How strong was the edge? */}
        {(teamComparison?.length || gameProfile?.length) && (
          <Collapsible className="mt-5 border-t border-border/60 pt-3">
            <CollapsibleTrigger className="group flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 transition-colors hover:text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3 w-3" strokeWidth={2.25} />
                How strong was the edge?
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 space-y-1.5 text-[12px] text-muted-foreground/80">
              <div className="flex justify-between">
                <InfoTip label="Overall strength of the matchup advantage.">
                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                    Edge Strength
                  </span>
                </InfoTip>
                <span className="font-semibold text-foreground/90">{edgeStrength}</span>
              </div>
              <div className="flex justify-between">
                <InfoTip label="How many key signals were identified in this matchup.">
                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                    Signals Detected
                  </span>
                </InfoTip>
                <span className="font-mono tabular-nums text-foreground/90">{gameProfile?.length ?? 0}</span>
              </div>
              {(elevatedCount > 0 || moderateCount > 0) && (
                <div className="flex justify-between">
                  <InfoTip label="Higher-impact signals like pressure or scoring efficiency.">
                    <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                      Strong Signals
                    </span>
                  </InfoTip>
                  <span className="text-foreground/90">
                    {elevatedCount} Elevated · {moderateCount} Moderate
                  </span>
                </div>
              )}
              {totalMetrics > 0 && (
                <div className="flex justify-between">
                  <InfoTip label="Number of statistical categories where one team performed better.">
                    <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                      Metric Edges
                    </span>
                  </InfoTip>
                  <span className="font-mono tabular-nums text-foreground/90">
                    {decidedMetrics} of {totalMetrics}
                  </span>
                </div>
              )}
              {winnerTeam && winnerPts > 0 && (
                <div className="flex justify-between">
                  <span>Leaning Toward</span>
                  <span className="font-semibold text-foreground/90">{winnerTeam.shortName}</span>
                </div>
              )}
              {lean?.confidence_context && (
                <div className="flex justify-between">
                  <span>Early-season adjustment</span>
                  <span className="text-foreground/90">Applied</span>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

function PredictionPill({
  label,
  team,
  match,
}: {
  label: string;
  team: string | null;
  match: "match" | "miss" | "neutral";
}) {
  const ring =
    match === "match"
      ? "border-success/50 bg-success/10"
      : match === "miss"
      ? "border-destructive/50 bg-destructive/10"
      : "border-border bg-muted/30";
  return (
    <div className={`flex flex-col items-center rounded-md border px-4 py-2 ${ring}`}>
      <span className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </span>
      <span className="mt-0.5 text-base font-bold tracking-tight text-foreground">{team ?? "—"}</span>
    </div>
  );
}

function EdgeBar({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.max(6, Math.round((value / max) * 100));
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </span>
      <div className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted/50">
        <div
          className="h-full rounded-full bg-accent-cool/70"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-mono text-[11px] tabular-nums text-foreground/85">
        {value}
      </span>
    </div>
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
      {details.model_outcome && (
        <ModelTrustCard
          outcome={details.model_outcome}
          lean={matchup_lean}
          teamComparison={team_comparison}
          gameProfile={game_profile}
          awayTeam={awayTeam}
          homeTeam={homeTeam}
        />
      )}

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
