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
  Shield,
  Zap,
  TrendingUp,
  Target,
  type LucideIcon,
} from "lucide-react";
import { useGameDetails, userMessageForError, type GameDetails } from "@/lib/nfl-api";
import { getTeam, teamLogoUrl, type TeamMeta } from "@/lib/nfl-teams";
import { MatchupAnalyzing } from "@/components/MatchupAnalyzing";
import { MatchupSupportBadge } from "@/components/MatchupSupportBadge";
import { CoreAreaAdvantage } from "@/components/CoreAreaAdvantage";

import { SectionGuide } from "@/components/SectionGuide";

const SECTION_SPOTLIGHT_TOUR_SEEN_KEY = "hasSeenMatchupSectionSpotlightTour";
import { Layers, Compass, Columns } from "lucide-react";
import SectionSpotlightTour, {
  type SpotlightTourStep,
} from "@/components/SectionSpotlightTour";
import { useEffect, useState, forwardRef } from "react";
import { perfMark } from "@/lib/perf";

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

// Backend-provided icon keys → Lucide components.
const ICON_MAP: Record<string, LucideIcon> = {
  activity: Activity,
  shield: Shield,
  zap: Zap,
  "trending-up": TrendingUp,
  target: Target,
  "alert-triangle": AlertTriangle,
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

const TeamLogo = forwardRef<
  HTMLImageElement,
  {
    team: TeamMeta;
    fallbackLogo?: string;
    size?: number;
  }
>(function TeamLogo({ team, fallbackLogo, size = 40 }, ref) {
  const src = teamLogoUrl(team.abbr, 500) || fallbackLogo;
  return (
    <img
      ref={ref}
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
});

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
  modelTrust,
  awayTeam,
  homeTeam,
}: {
  outcome: NonNullable<GameDetails["model_outcome"]>;
  lean: GameDetails["matchup_lean"];
  teamComparison: GameDetails["team_comparison"];
  gameProfile: GameDetails["game_profile"];
  modelTrust: GameDetails["model_trust"];
  awayTeam: TeamMeta;
  homeTeam: TeamMeta;
}) {
  const result = outcome.result;
  const isCorrect = /correct/i.test(result) && !/incorrect/i.test(result);
  const isIncorrect = /incorrect/i.test(result);
  const isNoPick = /no pick/i.test(result) || (!isCorrect && !isIncorrect);

  const baseTone = isCorrect
    ? {
        Icon: Check,
        topBorder: "border-t-success",
        text: "text-success",
        chipBg: "bg-success/20 dark:bg-success/25",
        chipBorder: "border-success/55",
        ring: "ring-success/25",
        glow: "shadow-[0_0_28px_-8px_hsl(var(--success)/0.55)]",
        label: "Model prediction matched game result",
        defaultLearningTag: "Model aligned with outcome",
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
        defaultLearningTag: "Model miss — learning opportunity logged",
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
        defaultLearningTag: "Neutral — model avoided low-confidence scenario",
        learningIcon: Minus,
        learningBg: "bg-muted/40 border-border text-muted-foreground",
      };

  // Allow backend to override learning tag tone if provided.
  // Backend currently sends learning_label as a plain string; tolerate object form too.
  const rawLearning = modelTrust?.learning_label;
  const backendLearningText =
    typeof rawLearning === "string" ? rawLearning : rawLearning?.text ?? null;
  const learningTone =
    typeof rawLearning === "string" ? null : rawLearning?.tone ?? null;
  const learningStyle =
    learningTone === "positive"
      ? { icon: Check, bg: "bg-success/10 border-success/40 text-success" }
      : learningTone === "negative"
      ? { icon: AlertTriangle, bg: "bg-destructive/10 border-destructive/40 text-destructive" }
      : learningTone === "neutral"
      ? { icon: Minus, bg: "bg-muted/40 border-border text-muted-foreground" }
      : { icon: baseTone.learningIcon, bg: baseTone.learningBg };

  const tone = baseTone;
  const Icon = tone.Icon;
  const LearningIcon = learningStyle.icon;
  // Backend fully owns learning label messaging when model_trust is present.
  // Only fall back to a frontend default if model_trust itself is missing.
  const learningTagText = modelTrust
    ? backendLearningText
    : tone.defaultLearningTag;

  const predicted = outcome.predicted_team ?? lean?.target_team ?? null;
  const actual = outcome.actual_winner ?? null;

  // ── Matchup Advantage ── prefer backend; fallback to frontend derivation
  const sideToTeam = (side: string): TeamMeta | null => {
    if (side === "away") return awayTeam;
    if (side === "home") return homeTeam;
    return null;
  };

  // Backend matchup_advantage shape: { away: number, home: number, leader, visible }
  const ma = modelTrust?.matchup_advantage ?? null;
  const advantageFromBackend = !!ma;
  const advantageVisible = ma ? ma.visible !== false : false;
  const awayAdvBackend = typeof ma?.away === "number" ? ma.away : null;
  const homeAdvBackend = typeof ma?.home === "number" ? ma.home : null;

  let awayPts = 0;
  let homePts = 0;
  if (advantageFromBackend) {
    awayPts = awayAdvBackend ?? 0;
    homePts = homeAdvBackend ?? 0;
  } else {
    (teamComparison ?? []).forEach((r) => {
      if (r.better === "away") awayPts += 1;
      else if (r.better === "home") homePts += 1;
    });
  }

  // ── Edge Strength ── prefer backend (capitalize lowercase strings like "low" → "Low")
  let edgeStrength: string;
  if (modelTrust?.edge?.strength) {
    const s = modelTrust.edge.strength;
    edgeStrength = s.charAt(0).toUpperCase() + s.slice(1);
  } else {
    const winDiff = Math.abs(awayPts - homePts);
    edgeStrength = winDiff >= 3 ? "Strong" : winDiff >= 2 ? "Moderate" : "Low";
  }

  // ── Signal Alignment ── prefer backend
  type SignalAlignment = {
    category: string;
    aligns: "yes" | "no" | "neutral";
    teamLabel: string | null;
    sentence: string | null;
  };
  let signalAlignments: SignalAlignment[] = [];
  let alignmentSummaryText: string | null = null;

  if (modelTrust?.signal_alignment?.signals) {
    signalAlignments = modelTrust.signal_alignment.signals.map((s) => ({
      category: s.category ?? "",
      aligns: (s.aligns === "yes" || s.aligns === "no" || s.aligns === "neutral" ? s.aligns : "neutral") as
        | "yes"
        | "no"
        | "neutral",
      teamLabel:
        s.favored_side === "away"
          ? awayTeam.shortName ?? awayTeam.abbr
          : s.favored_side === "home"
          ? homeTeam.shortName ?? homeTeam.abbr
          : null,
      sentence: s.sentence ?? s.description ?? null,
    }));
    alignmentSummaryText =
      modelTrust.signal_alignment.summary ?? modelTrust.signal_alignment.summary_label ?? null;
  } else {
    // Fallback: original frontend derivation
    const teamMatchesText = (team: TeamMeta | null, text: string): boolean => {
      if (!team || !text) return false;
      const t = text.toLowerCase();
      return (
        (!!team.shortName && t.includes(team.shortName.toLowerCase())) ||
        (!!team.fullName && t.includes(team.fullName.toLowerCase())) ||
        (!!team.location && t.includes(team.location.toLowerCase())) ||
        (!!team.abbr && t.includes(team.abbr.toLowerCase()))
      );
    };
    const predictedTeamMeta: TeamMeta | null = predicted
      ? teamMatchesText(awayTeam, predicted)
        ? awayTeam
        : teamMatchesText(homeTeam, predicted)
        ? homeTeam
        : null
      : null;
    const opponentTeamMeta: TeamMeta | null =
      predictedTeamMeta === awayTeam ? homeTeam : predictedTeamMeta === homeTeam ? awayTeam : null;

    signalAlignments = (gameProfile ?? []).map((row) => {
      // Prefer backend-provided tilt_team ("home" | "away" | "neutral" | null).
      // Fall back to legacy tilt-string substring matching only if missing.
      let favoredTeam: TeamMeta | null = null;
      let favorsPredicted = false;
      let favorsOpponent = false;
      if (row.tilt_team === "home" || row.tilt_team === "away") {
        favoredTeam = row.tilt_team === "home" ? homeTeam : awayTeam;
        favorsPredicted = favoredTeam === predictedTeamMeta;
        favorsOpponent = favoredTeam === opponentTeamMeta;
      } else if (row.tilt_team === "neutral" || row.tilt_team === null) {
        favoredTeam = null;
      } else {
        const tilt = row.tilt ?? "";
        favorsPredicted = teamMatchesText(predictedTeamMeta, tilt);
        favorsOpponent = teamMatchesText(opponentTeamMeta, tilt);
        favoredTeam = favorsPredicted ? predictedTeamMeta : favorsOpponent ? opponentTeamMeta : null;
      }
      return {
        category: row.category,
        aligns: favorsPredicted ? "yes" : favorsOpponent ? "no" : "neutral",
        teamLabel: favoredTeam?.shortName ?? null,
        sentence: null,
      };
    });
    const decided = signalAlignments.filter((s) => s.aligns !== "neutral");
    const aligned = decided.filter((s) => s.aligns === "yes").length;
    if (decided.length === 0) alignmentSummaryText = null;
    else if (aligned === decided.length) alignmentSummaryText = "All signals agreed";
    else if (aligned === 0) alignmentSummaryText = "Signals disagreed";
    else alignmentSummaryText = "Mixed signals — not all signals agreed";
  }

  // ── Reasoning ("Why the model picked this") ── prefer backend
  const reasoningHeadline = modelTrust?.reasoning?.headline ?? null;
  const reasoningSummary = modelTrust?.reasoning?.summary ?? null;
  const reasoningDrivers = modelTrust?.reasoning?.drivers ?? null;
  const hasBackendReasoning = !!(reasoningHeadline || reasoningSummary || (reasoningDrivers && reasoningDrivers.length > 0));

  // Fallback reasoning rows (only used if backend reasoning is absent)
  const fallbackTopComparisons = (teamComparison ?? [])
    .filter((r) => r.better === "away" || r.better === "home")
    .slice(0, 2);
  const fallbackTopProfile = (gameProfile ?? [])
    .slice()
    .sort((a, b) => (LEVEL_STEPS[b.level] ?? 0) - (LEVEL_STEPS[a.level] ?? 0))[0];
  const fallbackWinnerSide: "away" | "home" | null =
    awayPts === homePts ? null : awayPts > homePts ? "away" : "home";
  const fallbackWinnerTeam =
    fallbackWinnerSide === "away" ? awayTeam : fallbackWinnerSide === "home" ? homeTeam : null;

  // Backend authoritative: only show when matchup_advantage exists, visible !== false,
  // and at least one side has an explicit numeric value (do not invent 0–0).
  const showAdvantage = advantageFromBackend
    ? advantageVisible && (awayAdvBackend !== null || homeAdvBackend !== null)
    : (awayPts > 0 || homePts > 0) && !!teamComparison && teamComparison.length > 0;

  const showEdgeDetails = !!edgeStrength || signalAlignments.length > 0;

  return (
    <Card className={`mb-6 border-border bg-card border-t-[3px] ${tone.topBorder}`}>
      <CardContent className="p-4">
        {/* Header */}
        <div className="mb-3 flex items-baseline gap-2">
          <ShieldCheck className="h-4 w-4 self-center text-muted-foreground/70" strokeWidth={2} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Model Trust &amp; Outcome</h3>
        </div>

        {/* Result */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <div
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 ${tone.chipBg} ${tone.chipBorder} ring-1 ${tone.ring} ${tone.glow}`}
          >
            <Icon className={`h-4 w-4 ${tone.text}`} strokeWidth={2.75} aria-hidden="true" />
            <span className={`text-sm font-bold leading-none tracking-tight ${tone.text}`}>{result}</span>
          </div>
        </div>

        {/* 2. Predicted vs Actual (compact) */}
        {!isNoPick && (predicted || actual) && (
          <div className="mt-2 flex items-center justify-center gap-2 text-[12.5px] text-muted-foreground">
            <span className="text-muted-foreground/70">Predicted</span>
            <span className="font-semibold text-foreground">{predicted ?? "—"}</span>
            <span className="text-muted-foreground/50">vs</span>
            <span className="text-muted-foreground/70">Actual</span>
            <span className="font-semibold text-foreground">{actual ?? "—"}</span>
          </div>
        )}

        {lean?.confidence_context && (
          <p className="mt-2 flex items-start justify-center gap-1.5 text-center text-[11px] leading-snug text-accent-warm">
            <AlertTriangle className="mt-[1px] h-3 w-3 shrink-0" strokeWidth={2.25} />
            <span>{lean.confidence_context}</span>
          </p>
        )}

        {/* 3. Why the model picked this — backend-first */}
        {hasBackendReasoning ? (
          <div className="mt-4">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Why the model picked this
            </p>
            {reasoningHeadline && (
              <p
                className={`mb-2 text-[13px] font-semibold leading-snug ${
                  isNoPick ? "text-accent-warm" : "text-foreground"
                }`}
              >
                {reasoningHeadline}
              </p>
            )}
            {reasoningSummary && (
              <p
                className={`text-[12.5px] leading-relaxed ${
                  isNoPick ? "text-accent-warm/80" : "text-muted-foreground"
                }`}
              >
                {reasoningSummary}
              </p>
            )}
          </div>
        ) : (
          (fallbackTopComparisons.length > 0 || fallbackTopProfile) && (
            <div className="mt-4">
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
                Why the model picked this
              </p>
              <ul className="space-y-1 text-[12px] leading-tight text-foreground/85">
                {fallbackTopComparisons.map((r) => {
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
                      <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent-cool" />
                      {tip ? <InfoTip label={tip}>{row}</InfoTip> : row}
                    </li>
                  );
                })}
                {fallbackTopProfile && (
                  <li className="flex gap-2">
                    <span className="mt-[6px] h-1 w-1 shrink-0 rounded-full bg-accent-cool" />
                    <span>
                      {fallbackWinnerTeam ? (
                        <>
                          <span className="font-semibold text-foreground">{fallbackWinnerTeam.shortName}</span>{" "}
                          had the stronger {fallbackTopProfile.category.toLowerCase()} profile
                        </>
                      ) : (
                        <>Stronger {fallbackTopProfile.category.toLowerCase()} profile detected</>
                      )}
                    </span>
                  </li>
                )}
              </ul>
            </div>
          )
        )}

        {/* 4. Matchup Advantage */}
        {showAdvantage && (
          <div className="mt-4">
            <InfoTip label="Shows how many matchup factors favored each team across stats and key signals.">
              <p className="mb-2 inline-block cursor-help text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60 underline decoration-dotted decoration-muted-foreground/25 underline-offset-4">
                Matchup Advantage
              </p>
            </InfoTip>
            <div className="flex items-center gap-6">
              <AdvantageChip team={awayTeam} value={awayPts} leading={awayPts > homePts} />
              <AdvantageChip team={homeTeam} value={homePts} leading={homePts > awayPts} />
            </div>
          </div>
        )}

        {/* 5. Model Learning Tag */}
        {learningTagText && (
          <div className="mt-5 flex justify-center">
            <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10.5px] font-medium ${learningStyle.bg}`}>
              <LearningIcon className="h-3 w-3" strokeWidth={2.5} />
              {learningTagText}
            </span>
          </div>
        )}

        {/* 6. Edge details — collapsed by default */}
        {showEdgeDetails && (
          <Collapsible className="mt-3 border-t border-border/60 pt-2">
            <CollapsibleTrigger className="group flex w-full items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground/70 transition-colors hover:text-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Info className="h-3 w-3" strokeWidth={2.25} />
                What supported or challenged the read?
              </span>
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-data-[state=open]:rotate-180" />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 space-y-2.5 text-[12px] text-muted-foreground/80">
              <div className="flex items-center justify-between">
                <InfoTip label="How lopsided the visible Team Comparison stats are. Edge strength only — not overall confidence.">
                  <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                    Team Comparison Support
                  </span>
                </InfoTip>
                <span className="font-semibold text-foreground/90">{edgeStrength}</span>
              </div>
              {signalAlignments.length > 0 && (
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <InfoTip label="Whether each Game Profile signal, such as Pressure, Turnover Risk, and Scoring Efficiency, tilted toward the predicted team.">
                      <span className="cursor-help underline decoration-dotted decoration-muted-foreground/30 underline-offset-4">
                        Game Profile Signals
                      </span>
                    </InfoTip>
                    {alignmentSummaryText && (
                      <span className="text-[11px] font-medium normal-case tracking-tight text-foreground/80">
                        {alignmentSummaryText}
                      </span>
                    )}
                  </div>
                  <ul className="space-y-1">
                    {signalAlignments.map((s, idx) => {
                      const isYes = s.aligns === "yes";
                      const isNo = s.aligns === "no";
                      const RowIcon = isYes ? Check : isNo ? X : Minus;
                      const iconColor = isYes
                        ? "text-success"
                        : isNo
                        ? "text-destructive"
                        : "text-muted-foreground/60";
                      return (
                        <li
                          key={`${s.category || "signal"}-${idx}`}
                          className="flex items-center gap-2 text-[12px] text-foreground/80"
                        >
                          <RowIcon className={`h-3.5 w-3.5 shrink-0 ${iconColor}`} strokeWidth={2.5} />
                          {s.sentence ? (
                            <span className="text-foreground/85">{s.sentence}</span>
                          ) : (
                            <span>
                              {s.category && (
                                <span className="text-foreground/90">{s.category}</span>
                              )}{" "}
                              <span className="text-muted-foreground/75">
                                {s.aligns === "neutral"
                                  ? "was neutral"
                                  : `favored ${s.teamLabel ?? "neither team"}`}
                              </span>
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
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

const AdvantageChip = forwardRef<
  HTMLDivElement,
  { team: TeamMeta; value: number; leading: boolean }
>(function AdvantageChip({ team, value, leading }, ref) {
  const tip = leading
    ? "This team had more matchup factors in its favor."
    : "This team had fewer matchup factors in its favor.";
  const wrapStyles = leading
    ? "bg-accent-cool/8 ring-1 ring-inset ring-accent-cool/25"
    : "bg-muted/25 ring-1 ring-inset ring-border/40";
  const labelColor = leading ? "text-muted-foreground/85" : "text-muted-foreground/60";
  const valueColor = leading ? "text-foreground" : "text-foreground/65";
  return (
    <InfoTip ref={ref} label={tip}>
      <div
        className={`inline-flex cursor-help items-baseline gap-2 rounded-md px-2.5 py-1 transition-colors duration-150 ${wrapStyles}`}
      >
        <span className={`text-[11px] font-medium tracking-tight ${labelColor}`}>
          {team.shortName}
        </span>
        <span className={`font-mono text-[13px] font-semibold leading-none tabular-nums ${valueColor}`}>
          {value}
        </span>
      </div>
    </InfoTip>
  );
});

const InfoTip = forwardRef<
  HTMLSpanElement,
  { label: string; children: React.ReactNode }
>(function InfoTip({ label, children }, ref) {
  return (
    <Tooltip delayDuration={120}>
      <TooltipTrigger asChild>
        <span ref={ref} className="inline-flex">
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[240px] text-[11.5px] leading-snug">
        {label}
      </TooltipContent>
    </Tooltip>
  );
});

function confidenceTooltip(level: string): string {
  const v = level.toLowerCase();
  if (v.includes("high")) return "Clear advantage across multiple factors.";
  if (v.includes("med")) return "Some edge, but not fully consistent.";
  if (v.includes("low")) return "Very small edge or uncertain matchup.";
  return "Model confidence in this matchup.";
}

// ── v1.6 Matchup Read block: Profile + Outcome chips with graceful fallback ──

const CAUTION_LABEL_MAP: Record<string, string> = {
  core_area_gap_is_small: "Core areas are close",
  core_areas_are_split: "Core areas are split",
  core_areas_do_not_fully_confirm_lean: "Broader profile is mixed",
  supporting_context_is_mixed_or_limited: "Supporting context is limited",
};

const HIDDEN_CAUTIONS = new Set(["strong_profile_does_not_guarantee_outcome"]);

function cautionText(
  c: NonNullable<NonNullable<GameDetails["matchup_lean"]>["matchup_cautions"]>[number],
): string | null {
  let raw: string | null = null;
  if (typeof c === "string") raw = c.trim() || null;
  else if (c && typeof c === "object") raw = (c.text || c.label || "").trim() || null;
  if (!raw) return null;
  if (HIDDEN_CAUTIONS.has(raw)) return null;
  if (CAUTION_LABEL_MAP[raw]) return CAUTION_LABEL_MAP[raw];
  // Fallback: snake_case → readable title case
  return raw
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function confidenceChipLabel(label: string): string {
  const short = label.trim();
  if (/^(low|medium|moderate|high|very high|elevated|mixed)$/i.test(short)) {
    return `${short} Confidence`;
  }
  return short;
}

function MatchupReadBlock({ lean }: { lean: NonNullable<GameDetails["matchup_lean"]> }) {
  const profileLabel = lean.profile_strength?.label?.trim() || null;
  const outcomeLabel = lean.outcome_confidence?.label?.trim() || null;
  const profileSummary = lean.profile_strength?.summary?.trim() || null;
  const outcomeSummary = lean.outcome_confidence?.summary?.trim() || null;
  const matchupLabel = lean.matchup_label?.trim() || null;
  const cautions = (lean.matchup_cautions ?? [])
    .map(cautionText)
    .filter((s): s is string => !!s);

  // Resolve the two chips with fallback chain.
  let profileChip: string | null = profileLabel;
  let outcomeChip: string | null = outcomeLabel;
  let singleChip: string | null = null;

  if (!profileChip && !outcomeChip && matchupLabel) {
    if (matchupLabel.includes(" / ")) {
      const [a, b] = matchupLabel.split(" / ").map((s) => s.trim());
      profileChip = a || null;
      outcomeChip = b || null;
    } else {
      singleChip = matchupLabel;
    }
  }

  const hasNewRead = !!(profileChip || outcomeChip || singleChip || profileSummary || outcomeSummary || cautions.length);

  // Legacy fallback: render the original Confidence pill exactly as before.
  if (!hasNewRead) {
    if (!lean.confidence) return null;
    return (
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Confidence
        </span>
        <InfoTip label={confidenceTooltip(lean.confidence)}>
          <span className="rounded-full border border-accent-cool/40 bg-accent-cool/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground">
            {lean.confidence}
          </span>
        </InfoTip>
      </div>
    );
  }

  const chipBase =
    "inline-flex items-center rounded-full border border-accent-cool/40 bg-accent-cool/10 px-2.5 py-0.5 text-[11px] font-semibold text-foreground";
  const cautionChip =
    "inline-flex items-center rounded-full border border-border/70 bg-muted/30 px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground/90";

  return (
    <div className="rounded-md border border-border/60 bg-muted/10 px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
          Matchup Read
        </span>
        <div className="flex flex-wrap items-center gap-1.5">
          {singleChip && (
            <InfoTip label="Backend matchup read.">
              <span className={chipBase}>{singleChip}</span>
            </InfoTip>
          )}
          {profileChip && (
            <InfoTip label="How clean the matchup profile looks.">
              <span className={chipBase}>{profileChip}</span>
            </InfoTip>
          )}
          {profileChip && outcomeChip && (
            <span className="text-[11px] text-muted-foreground/50">/</span>
          )}
          {outcomeChip && (
            <InfoTip label="How confident the model is in the actual outcome.">
              <span className={chipBase}>{confidenceChipLabel(outcomeChip)}</span>
            </InfoTip>
          )}
        </div>
      </div>
      {(profileSummary || outcomeSummary) && (
        <div className="space-y-1">
          {profileSummary && (
            <p className="text-[12px] leading-snug text-muted-foreground/85">
              <span className="font-semibold text-foreground/80">Profile:</span> {profileSummary}
            </p>
          )}
          {outcomeSummary && (
            <p className="text-[12px] leading-snug text-muted-foreground/85">
              <span className="font-semibold text-foreground/80">Confidence:</span> {outcomeSummary}
            </p>
          )}
        </div>
      )}
      {cautions.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
          <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/60">
            Why cautious
          </span>
          {cautions.map((c, i) => (
            <span key={i} className={cautionChip}>
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function formatStatGap(away: number | null | undefined, home: number | null | undefined): string | null {
  if (away == null || home == null || !isFinite(away) || !isFinite(home)) return null;
  if (away === home) return null;
  const fmt = (n: number) => (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(2));
  return `${fmt(away)} vs ${fmt(home)}`;
}

// ─────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────

export default function Matchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  const { data, isLoading, isFetching, isError, error } = useGameDetails(id);

  // Dev-only timing markers
  useEffect(() => {
    perfMark(`Matchup route mounted (${id})`);
  }, [id]);
  useEffect(() => {
    if (data) perfMark(`Matchup first data paint (${id})`);
  }, [data, id]);

  // Always start at the top when entering a Game Details page
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [id]);

  // Cold load only — when cached data exists (from React Query persisted
  // cache) we render the page instantly and only run a quiet background
  // refresh. The analyzing animation is reserved for true cold loads.
  const isColdLoad = isLoading && !data;

  // Minimum display time so the analyzing UI doesn't flash on fast cold
  // loads. Only armed when we actually start a cold load.
  const [minTimeElapsed, setMinTimeElapsed] = useState(true);
  useEffect(() => {
    if (!isColdLoad) {
      setMinTimeElapsed(true);
      return;
    }
    setMinTimeElapsed(false);
    const t = window.setTimeout(() => setMinTimeElapsed(true), 1000);
    return () => window.clearTimeout(t);
  }, [id, isColdLoad]);

  const showAnalyzing = isColdLoad || (!data && !isError && !minTimeElapsed);
  const isBackgroundRefresh = isFetching && !!data;
  const showStaleWarning = isError && !!data;

  return (
    <AppShell>
      
      <div className="mx-auto max-w-4xl pt-1 pb-8">

        <Button
          variant="ghost"
          size="sm"
          className="mb-3 -ml-2 gap-1.5 text-muted-foreground hover:text-primary"
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

        {showAnalyzing && <MatchupAnalyzing />}

        {isError && !data && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="p-5">
              <p className="text-sm font-semibold text-destructive">Couldn't load this game</p>
              <p className="mt-1 text-xs text-muted-foreground">{userMessageForError(error)}</p>
            </CardContent>
          </Card>
        )}

        {data && !showAnalyzing && (
          <>
            {(isBackgroundRefresh || showStaleWarning) && (
              <div className="mb-3 flex justify-end">
                {isBackgroundRefresh && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground/70">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary/70" />
                    Refreshing…
                  </span>
                )}
                {showStaleWarning && (
                  <span className="inline-flex items-center gap-1.5 text-[10px] text-amber-500/80">
                    Showing cached data — refresh failed
                  </span>
                )}
              </div>
            )}
            <MatchupContent details={data} routeId={id} />
          </>
        )}
      </div>
    </AppShell>
  );
}

function getCoreAreaContextText(
  context?: NonNullable<GameDetails["matchup_lean"]>["core_area_context"],
): string | null {
  if (!context || !context.available) return null;
  // Normalize "2-2" → "2–2" for cleaner typography.
  const split = context.core_area_split?.replace(/(\d)-(\d)/g, "$1–$2");
  switch (context.profile_type) {
    case "coin_flip_profile":
      return split
        ? `Core Areas were split ${split} and nearly even overall.`
        : "Core Areas were nearly even overall.";
    case "split_profile":
      return split
        ? `Core Areas were split ${split}, limiting confidence.`
        : "Core Areas were split, limiting confidence.";
    case "conflicting_profile":
      return "Core Area context did not fully confirm the signal lean.";
    case "confirmed_edge":
      return "Core Areas supported the same side as the signal lean.";
    default:
      return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Profile drivers — "What's shaping this matchup"
// Small collapsed subsection rendered inside the Game Profile card.
// UI-only: filters & wording happen here; never alters backend data.
// ─────────────────────────────────────────────────────────────

const PROFILE_DRIVERS_BLOCKLIST = [
  "should win",
  "will win",
  "will cover",
  "lock",
  "best bet",
  "guaranteed",
];

function isUsableDriverSummary(s: string): boolean {
  const trimmed = s.trim();
  if (!trimmed) return false;
  const lower = trimmed.toLowerCase();
  return !PROFILE_DRIVERS_BLOCKLIST.some((phrase) => lower.includes(phrase));
}

function isUsableDriverLabel(s: string, parentLabel: string): boolean {
  const trimmed = s.trim();
  if (!trimmed || trimmed.length > 40) return false;
  if (trimmed.includes("_")) return false;
  if (trimmed.toLowerCase() === parentLabel.trim().toLowerCase()) return false;
  const lower = trimmed.toLowerCase();
  if (PROFILE_DRIVERS_BLOCKLIST.some((p) => lower.includes(p))) return false;
  // Must look like a human phrase: contains a space OR an uppercase past index 0.
  const hasSpace = /\s/.test(trimmed);
  const hasMidUpper = /[A-Z]/.test(trimmed.slice(1));
  return hasSpace || hasMidUpper;
}

type DriverTone = "moderate" | "elevated" | "neutral";

type ParentSignal =
  | "Pressure"
  | "Turnover Risk"
  | "Scoring Efficiency"
  | "Explosiveness"
  | "Defensive Stability"
  | "Tempo";

const PARENT_SIGNAL_KEYWORDS: Array<{ signal: ParentSignal; pattern: RegExp }> = [
  { signal: "Pressure", pattern: /\b(pressure|pass rush|sack|qb hit|hurry|blitz)\b/ },
  { signal: "Turnover Risk", pattern: /\b(turnover|takeaway|giveaway|interception|int rate|fumble)\b/ },
  {
    signal: "Scoring Efficiency",
    pattern: /\b(scoring|red zone|red-zone|drive conversion|points per drive|offensive rhythm|passing game|third down|3rd down|goal[- ]to[- ]go)\b/,
  },
  { signal: "Explosiveness", pattern: /\b(explosive|big play|yards per play|ypp|chunk)\b/ },
  {
    signal: "Defensive Stability",
    pattern: /\b(run defense|rush defense|yards allowed|defensive efficiency|epa allowed)\b/,
  },
  { signal: "Tempo", pattern: /\b(tempo|pace|seconds per play|plays per game)\b/ },
];

function mapToParentSignal(name: string, driverLabels: string[]): ParentSignal | null {
  const candidates = [name, ...driverLabels.slice(0, 2)]
    .map((s) => (s ?? "").toLowerCase().trim())
    .filter(Boolean);
  for (const c of candidates) {
    for (const { signal, pattern } of PARENT_SIGNAL_KEYWORDS) {
      if (pattern.test(c)) return signal;
    }
  }
  return null;
}

function toneFromParentLevel(
  gameProfile: GameDetails["game_profile"],
  parent: ParentSignal | null,
): DriverTone {
  if (!parent || !gameProfile) return "neutral";
  const parentKeywords = PARENT_SIGNAL_KEYWORDS.find((k) => k.signal === parent)?.pattern;
  if (!parentKeywords) return "neutral";
  const tile = gameProfile.find((row) => {
    const cat = (row?.category ?? "").toLowerCase();
    return cat === parent.toLowerCase() || parentKeywords.test(cat);
  });
  if (!tile) return "neutral";
  const level = (tile.level ?? "").toLowerCase();
  if (/\b(elevated|high)\b/.test(level)) return "elevated";
  if (/\bmoderate\b/.test(level)) return "moderate";
  return "neutral";
}

const TONE_CLASSES: Record<DriverTone, { border: string; label: string }> = {
  moderate: { border: "border-level-moderate/60", label: "text-level-moderate/90" },
  elevated: { border: "border-level-elevated/60", label: "text-level-elevated/90" },
  neutral: { border: "border-border/50", label: "text-foreground/75" },
};

function ProfileDrivers({
  summaries,
  gameProfile,
}: {
  summaries: NonNullable<NonNullable<GameDetails["matchup_breakdown"]>["category_summaries"]>;
  gameProfile: GameDetails["game_profile"];
}) {
  const [open, setOpen] = useState(false);

  const items = summaries
    .map((s) => {
      const label = (s?.name ?? s?.category ?? "").trim();
      const summary = (s?.summary ?? "").trim();
      const rawDrivers = Array.isArray(s?.drivers) ? s!.drivers! : [];
      const keyInputs: string[] = [];
      const seen = new Set<string>();
      for (const d of rawDrivers) {
        if (typeof d === "string") continue;
        const candidate = (d?.label ?? "").trim();
        if (!candidate || !isUsableDriverLabel(candidate, label)) continue;
        const key = candidate.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        keyInputs.push(candidate);
        if (keyInputs.length >= 2) break;
      }
      const parent = mapToParentSignal(label, keyInputs);
      const tone = toneFromParentLevel(gameProfile, parent);
      return { label, summary, tone, keyInputs };
    })
    .filter((it) => it.summary && isUsableDriverSummary(it.summary))
    .slice(0, 4);

  if (items.length === 0) return null;

  return (
    <div className="mt-5 border-t border-border/40 pt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-md py-1.5 text-left text-[12px] font-medium text-foreground/80 transition-colors hover:text-foreground outline-none focus-visible:ring-1 focus-visible:ring-muted-foreground/40"
      >
        <span>What&rsquo;s shaping this matchup</span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && (
        <div className="mt-2">
          <p className="mb-3 text-[11px] text-muted-foreground/70">
            Context behind the signals above.
          </p>
          <ul className="space-y-3">
            {items.map((it, i) => {
              const tc = TONE_CLASSES[it.tone];
              return (
                <li key={`${it.label}-${i}`} className={`border-l-2 pl-3 ${tc.border}`}>
                  {it.label && (
                    <p className={`text-[11px] uppercase tracking-[0.1em] ${tc.label}`}>
                      {it.label}
                    </p>
                  )}
                  <p className="mt-0.5 text-[12.5px] leading-snug text-muted-foreground">
                    {it.summary}
                  </p>
                  {it.keyInputs.length > 0 && (
                    <p className="mt-1 text-[11.5px] text-muted-foreground/80">
                      Key inputs: {it.keyInputs.join(", ")}.
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

function MatchupContent({ details, routeId }: { details: GameDetails; routeId?: string }) {
  const { header, final_score, game_profile, matchup_lean, team_comparison } = details;
  const awayTeam = teamFromApi(header.away_team);
  const homeTeam = teamFromApi(header.home_team);
  const showStatus = header.game_status && header.game_status !== "Scheduled";
  // Render final score whenever the API returns it — trust the backend.
  const hasFinalScore = !!final_score;
  const coreAreaContextText = getCoreAreaContextText(matchup_lean?.core_area_context);

  // Section-guided per-section guidance is currently disabled in production.
  const [sectionGuidesOn] = useState<boolean>(false);
  // Spotlight tour: auto-opens on first visit; re-opens any time the
  // header "?" button dispatches `gamelens:open-guide`.
  const [tourOpen, setTourOpen] = useState<boolean>(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(SECTION_SPOTLIGHT_TOUR_SEEN_KEY) !== "true") {
        setTourOpen(true);
      }
    } catch {
      setTourOpen(true);
    }
    const onOpenGuide = () => setTourOpen(true);
    window.addEventListener("gamelens:open-guide", onOpenGuide);
    return () => window.removeEventListener("gamelens:open-guide", onOpenGuide);
  }, []);

  const markTourSeenAndClose = () => {
    try {
      localStorage.setItem(SECTION_SPOTLIGHT_TOUR_SEEN_KEY, "true");
    } catch {
      /* ignore */
    }
    setTourOpen(false);
  };

  const tourSteps: SpotlightTourStep[] = [
    {
      key: "game-profile",
      targetSelector: "[data-tour='game-profile']",
      title: "Game Profile",
      body:
        "Game Profile highlights the main matchup signals, like pressure, scoring efficiency, and turnover risk.",
      icon: Activity,
      available: !!(game_profile && game_profile.length > 0),
    },
    {
      key: "core-area-advantage",
      targetSelector: "[data-tour='core-area-advantage']",
      title: "Core Area Advantage",
      body:
        "Core Areas group related metrics into bigger team strengths so you can see where each side has the edge.",
      icon: Layers,
      available: !!(details.core_area_comparison && details.core_area_comparison.length > 0),
    },
    {
      key: "matchup-lean",
      targetSelector: "[data-tour='matchup-lean']",
      title: "Matchup Lean / Confidence",
      body:
        "Matchup Lean is the backend's directional read. Confidence tells you how strong or cautious that read should feel.",
      icon: Compass,
      available: !!matchup_lean,
    },
    {
      key: "team-comparison",
      targetSelector: "[data-tour='team-comparison']",
      title: "Team Comparison",
      body: "Team Comparison shows the metric-level gaps behind the matchup read.",
      icon: Columns,
      available: !!(team_comparison && team_comparison.length > 0),
    },
    {
      key: "model-trust",
      targetSelector: "[data-tour='model-trust']",
      title: "Model Trust / Outcome",
      body:
        "After the game, Model Trust reviews whether the model was right, close, or missed — and why.",
      icon: ShieldCheck,
      available:
        (header.game_status === "Final" || header.game_status === "Final/OT") &&
        !!details.model_outcome,
    },
  ];

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
        <SectionGuide
          enabled={sectionGuidesOn}
          sectionKey="game-profile"
          title="Game Profile"
          body="Game Profile highlights the main matchup signals, like pressure, scoring efficiency, and turnover risk."
        />
      )}
      {game_profile && game_profile.length > 0 && (
        <Card data-tour="game-profile" className="mb-6 border-border bg-card">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Game Profile</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">Signals</span>
            </div>
            <div className="grid grid-cols-1 gap-x-8 gap-y-6 sm:grid-cols-2">
              {game_profile.map((row) => {
                // Prefer backend-provided icon key; fall back to category inference.
                const Icon = row.icon ? ICON_MAP[row.icon] ?? iconForCategory(row.category) : iconForCategory(row.category);
                // Prefer backend-provided level_index (0–3) → filled count 1–4.
                const steps = typeof row.level_index === "number"
                  ? row.level_index + 1
                  : LEVEL_STEPS[row.level] ?? 2;
                const colorCls = LEVEL_COLOR[row.level] ?? "text-foreground";
                const barCls = LEVEL_BAR[row.level] ?? "bg-muted-foreground/60";
                // Prefer backend tilt_text; fall back to legacy tilt string.
                const tiltDisplay = row.tilt_text ?? row.tilt ?? "";
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
                    {tiltDisplay && (
                      <p className="mt-2 text-[11px] leading-snug text-muted-foreground/55">
                        <span className="font-medium text-muted-foreground/75">Tilt:</span> {tiltDisplay}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
            {details.matchup_breakdown?.category_summaries && details.matchup_breakdown.category_summaries.length > 0 && (
              <ProfileDrivers summaries={details.matchup_breakdown.category_summaries} gameProfile={game_profile} />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Core Area Advantage ── */}
      {details.core_area_comparison && details.core_area_comparison.length > 0 && (
        <SectionGuide
          enabled={sectionGuidesOn}
          sectionKey="core-area-advantage"
          title="Core Area Advantage"
          body="Core Areas group related metrics into bigger team strengths so you can see where each side has the edge."
        />
      )}
      {details.core_area_comparison && details.core_area_comparison.length > 0 && (
        <div data-tour="core-area-advantage">
          <CoreAreaAdvantage
            rows={details.core_area_comparison}
            awayAbbr={awayTeam.abbr}
            homeAbbr={homeTeam.abbr}
          />
        </div>
      )}

      {/* ── Matchup Lean ── */}
      {matchup_lean && (
        <SectionGuide
          enabled={sectionGuidesOn}
          sectionKey="matchup-lean"
          title="Matchup Lean / Confidence"
          body="Matchup Lean is the backend's directional read. Confidence tells you how strong or cautious that read should feel."
        />
      )}
      {matchup_lean && (
        <Card data-tour="matchup-lean" className="mb-6 border-border bg-card border-t-[3px] border-t-accent-cool shadow-[0_0_0_1px_hsl(var(--accent-cool)/0.08)] dark:border-t-accent-cool">
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight text-foreground">Matchup Lean</h3>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Decision Support
              </span>
            </div>

            <div className="space-y-3">
              <div className="space-y-2">
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
                {coreAreaContextText && (
                  <p className="text-[11.5px] leading-snug text-muted-foreground/70">
                    {coreAreaContextText}
                  </p>
                )}
              </div>
              <MatchupReadBlock lean={matchup_lean} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Model Trust & Outcome ── only for finalized games ── */}
      {(header.game_status === "Final" || header.game_status === "Final/OT") && details.model_outcome && (
        <SectionGuide
          enabled={sectionGuidesOn}
          sectionKey="model-trust"
          title="Model Trust / Outcome"
          body="After the game, Model Trust reviews whether the model was right, close, or missed — and why."
        />
      )}
      {(header.game_status === "Final" || header.game_status === "Final/OT") && details.model_outcome && (
        <div data-tour="model-trust">
          <ModelTrustCard
            outcome={details.model_outcome}
            lean={matchup_lean}
            teamComparison={team_comparison}
            gameProfile={game_profile}
            modelTrust={details.model_trust ?? null}
            awayTeam={awayTeam}
            homeTeam={homeTeam}
          />
        </div>
      )}

      {/* ── Team Comparison ── */}
      {team_comparison && team_comparison.length > 0 && (
        <SectionGuide
          enabled={sectionGuidesOn}
          sectionKey="team-comparison"
          title="Team Comparison"
          body="Team Comparison shows the metric-level gaps behind the matchup read."
        />
      )}
      {team_comparison && team_comparison.length > 0 && (
        <Card data-tour="team-comparison" className="mb-10 border-border/80 bg-gradient-to-b from-card to-card/60 shadow-[0_1px_0_0_hsl(var(--border)/0.6),0_20px_40px_-24px_hsl(var(--primary)/0.18)] ring-1 ring-border/40">
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
                const supportAllowed = r.language_support?.language_boost_allowed === true;
                const showAwayBadge = supportAllowed && adv === "away";
                const showHomeBadge = supportAllowed && adv === "home";
                const winnerAbbr =
                  adv === "away" ? awayTeam.abbr : adv === "home" ? homeTeam.abbr : null;
                const rowBgCls = supportAllowed
                  ? "bg-[hsl(var(--accent-cool)/0.03)] dark:bg-[hsl(var(--accent-cool)/0.05)]"
                  : "";
                const rowHoverCls = "hover:bg-muted/30";
                const labelCls = supportAllowed
                  ? "text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/80"
                  : "text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground";
                return (
                  <div
                    key={r.label}
                    className={`-mx-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-md px-2 py-3 transition-all duration-150 ${rowHoverCls} ${rowBgCls}`}
                  >
                    <div className={`flex flex-wrap items-center justify-start gap-x-2 gap-y-1 text-left font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("away")}`}>
                      <span>{formatNumber(r.away, r.label)}</span>
                      {showAwayBadge && (
                        <MatchupSupportBadge allowed={supportAllowed} teamAbbr={winnerAbbr} />
                      )}
                    </div>
                    <span className={labelCls}>
                      {r.label}
                    </span>
                    <div className={`flex flex-wrap items-center justify-end gap-x-2 gap-y-1 text-right font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("home")}`}>
                      {showHomeBadge && (
                        <MatchupSupportBadge allowed={supportAllowed} teamAbbr={winnerAbbr} />
                      )}
                      <span>{formatNumber(r.home, r.label)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
      <SectionSpotlightTour
        open={tourOpen}
        steps={tourSteps}
        onClose={markTourSeenAndClose}
        onComplete={markTourSeenAndClose}
      />
    </>
  );
}
