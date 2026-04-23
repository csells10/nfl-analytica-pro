import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Zap,
  Shield,
  Swords,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  ExternalLink,
} from "lucide-react";
import type { NflGame } from "@/lib/nfl-api";
import { getTeam, teamLogoUrl, type TeamMeta } from "@/lib/nfl-teams";

// ─────────────────────────────────────────────────────────────
// Mock data — replace with real API later
// ─────────────────────────────────────────────────────────────

interface TeamMetrics {
  pointsPerPlay: number;
  pointsAllowedPerPlay: number;
  thirdDownPct: number;
  redZoneTdPct: number;
  turnoverMargin: number;
  timeOfPossession: string; // "MM:SS"
}

interface RecentGame {
  opponent: string;
  score: string;
  result: "W" | "L";
  home: boolean;
}

const mockMetrics: Record<"away" | "home", TeamMetrics> = {
  away: {
    pointsPerPlay: 0.42,
    pointsAllowedPerPlay: 0.31,
    thirdDownPct: 41.2,
    redZoneTdPct: 58.4,
    turnoverMargin: +5,
    timeOfPossession: "30:42",
  },
  home: {
    pointsPerPlay: 0.38,
    pointsAllowedPerPlay: 0.28,
    thirdDownPct: 44.8,
    redZoneTdPct: 64.1,
    turnoverMargin: +3,
    timeOfPossession: "29:18",
  },
};

const mockRecent: Record<"away" | "home", RecentGame[]> = {
  away: [
    { opponent: "MIA", score: "27-21", result: "W", home: true },
    { opponent: "NYJ", score: "20-17", result: "W", home: false },
    { opponent: "KC", score: "17-24", result: "L", home: true },
    { opponent: "NE", score: "31-14", result: "W", home: false },
    { opponent: "BAL", score: "28-31", result: "L", home: true },
  ],
  home: [
    { opponent: "PHI", score: "21-24", result: "L", home: false },
    { opponent: "DAL", score: "30-20", result: "W", home: true },
    { opponent: "WAS", score: "26-13", result: "W", home: false },
    { opponent: "NYG", score: "17-23", result: "L", home: true },
    { opponent: "SF", score: "28-21", result: "W", home: false },
  ],
};

// Mock final-score scoring by quarter (used only when status is Final*).
// Shape is ready to swap with real API data.
interface FinalScore {
  away: { q1: number; q2: number; q3: number; q4: number; ot?: number; total: number };
  home: { q1: number; q2: number; q3: number; q4: number; ot?: number; total: number };
}

const mockFinalScore: FinalScore = {
  away: { q1: 7, q2: 10, q3: 3, q4: 7, total: 27 },
  home: { q1: 3, q2: 7, q3: 10, q4: 4, total: 24 },
};

// ─────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────

type Advantage = "away" | "home" | "even";

function compareHigher(a: number, b: number): Advantage {
  if (Math.abs(a - b) < 0.01) return "even";
  return a > b ? "away" : "home";
}

function compareLower(a: number, b: number): Advantage {
  if (Math.abs(a - b) < 0.01) return "even";
  return a < b ? "away" : "home";
}

function formatNum(n: number, decimals = 2) {
  return n.toFixed(decimals);
}

function isFinal(status?: string) {
  if (!status) return false;
  return /^final/i.test(status);
}

function espnGameUrl(gameId?: string) {
  if (!gameId) return "https://www.espn.com/nfl/scoreboard";
  // ESPN game IDs in the backend are typically the numeric ESPN eventId,
  // but our IDs look like "20260104_GB@MIN". Fall back to a search URL.
  const numeric = gameId.match(/\d{8,}/)?.[0];
  return numeric
    ? `https://www.espn.com/nfl/game/_/gameId/${numeric}`
    : `https://www.espn.com/nfl/scoreboard`;
}

// ─────────────────────────────────────────────────────────────
// Reusable UI bits
// ─────────────────────────────────────────────────────────────

function Badge({
  children,
  muted,
  accent,
  warm,
}: {
  children: React.ReactNode;
  muted?: boolean;
  accent?: boolean;
  warm?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${
        warm
          ? "border-accent-warm/30 bg-accent-warm/10 text-accent-warm"
          : accent
          ? "border-primary/30 bg-primary/10 text-primary"
          : muted
          ? "border-border/50 text-muted-foreground/60"
          : "border-border text-muted-foreground"
      }`}
    >
      {children}
    </span>
  );
}

function TeamLogo({ team, size = 40 }: { team: TeamMeta; size?: number }) {
  return (
    <img
      src={teamLogoUrl(team.abbr, 500)}
      alt={`${team.fullName} logo`}
      width={size}
      height={size}
      loading="lazy"
      className="object-contain"
      style={{ width: size, height: size }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.visibility = "hidden";
      }}
    />
  );
}

function SectionHeading({
  icon: Icon,
  title,
  hint,
}: {
  icon: React.ElementType;
  title: string;
  hint?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent-cool/20 ring-1 ring-inset ring-accent-cool/35 dark:bg-accent-cool/15 dark:ring-accent-cool/30">
        <Icon className="h-3.5 w-3.5 text-accent-cool" />
      </div>
      <h3 className="text-sm font-semibold tracking-tight text-foreground">{title}</h3>
      {hint && (
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
          {hint}
        </span>
      )}
    </div>
  );
}

function CompareRow({
  label,
  awayValue,
  homeValue,
  awayDisplay,
  homeDisplay,
  advantage,
  max,
}: {
  label: string;
  awayValue: number;
  homeValue: number;
  awayDisplay: string;
  homeDisplay: string;
  advantage: Advantage;
  max: number;
}) {
  const awayPct = max > 0 ? Math.min(100, (Math.abs(awayValue) / max) * 100) : 0;
  const homePct = max > 0 ? Math.min(100, (Math.abs(homeValue) / max) * 100) : 0;

  const awayBar =
    advantage === "away" ? "bg-primary" : advantage === "home" ? "bg-secondary" : "bg-muted-foreground/40";
  const homeBar =
    advantage === "home" ? "bg-primary" : advantage === "away" ? "bg-secondary" : "bg-muted-foreground/40";

  const awayText = advantage === "away" ? "text-primary" : "text-foreground/80";
  const homeText = advantage === "home" ? "text-primary" : "text-foreground/80";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        <span className={`font-mono text-xs normal-case tracking-normal ${awayText}`}>{awayDisplay}</span>
        <span>{label}</span>
        <span className={`font-mono text-xs normal-case tracking-normal ${homeText}`}>{homeDisplay}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-secondary/50">
          <div className={`h-full rounded-full ${awayBar} transition-all`} style={{ width: `${awayPct}%` }} />
        </div>
        <div className="h-2.5 w-px bg-border" />
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
          <div className={`h-full rounded-full ${homeBar} transition-all`} style={{ width: `${homePct}%` }} />
        </div>
      </div>
    </div>
  );
}

/**
 * Header row for a Matchup Breakdown card — displays the two team names
 * above the metric rows so the [team | metric | team] grid reads cleanly.
 */
function BreakdownHeader({ awayShort, homeShort }: { awayShort: string; homeShort: string }) {
  return (
    <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/60 pb-2.5">
      <span className="text-left text-[13px] font-semibold tracking-tight text-foreground">
        {awayShort}
      </span>
      <span className="px-3" aria-hidden="true" />
      <span className="text-right text-[13px] font-semibold tracking-tight text-foreground">
        {homeShort}
      </span>
    </div>
  );
}

/**
 * Breakdown row — true head-to-head comparison:
 *   [Away value] | Metric label | [Home value]
 * The winning side is highlighted; weaker side is dimmed. Subtle hover.
 */
function BreakdownRow({
  label,
  awayDisplay,
  homeDisplay,
  advantage,
}: {
  label: string;
  awayDisplay: string;
  homeDisplay: string;
  advantage: Advantage;
}) {
  const valueCls = (side: "away" | "home") =>
    advantage === side
      ? "text-foreground font-semibold"
      : advantage === "even"
      ? "text-foreground/75"
      : "text-foreground/45";

  return (
    <div className="-mx-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-md px-2 py-3 transition-all duration-150 hover:bg-muted/70 hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.22)] dark:hover:bg-muted/40 dark:hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.32)]">
      <span className={`text-left font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("away")}`}>
        {awayDisplay}
      </span>
      <span className="px-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <span className={`text-right font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("home")}`}>
        {homeDisplay}
      </span>
    </div>
  );
}

function ResultDot({ result }: { result: "W" | "L" }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
        result === "W" ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
      }`}
    >
      {result}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────
// Final score card
// ─────────────────────────────────────────────────────────────

function FinalScoreCard({
  away,
  home,
  score,
  status,
}: {
  away: TeamMeta;
  home: TeamMeta;
  score: FinalScore;
  status: string;
}) {
  const hasOt = score.away.ot !== undefined || score.home.ot !== undefined;
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
  const gridClass =
    "grid grid-cols-[1fr_repeat(var(--cols),2.5rem)_4rem] items-center gap-x-2";

  const TeamRow = ({
    team,
    perQuarter,
    total,
    winner,
  }: {
    team: TeamMeta;
    perQuarter: number[];
    total: number;
    winner: boolean;
  }) => (
    <div
      className={`${gridClass} group rounded-md px-2 py-2.5 transition-colors hover:bg-muted/30`}
      style={gridStyle}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <TeamLogo team={team} size={28} />
        <div className="min-w-0">
          <p
            className={`truncate text-sm font-semibold ${
              winner ? "text-foreground" : "text-foreground/75"
            }`}
          >
            {team.location} <span className="text-foreground/90">{team.shortName}</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.12em] text-muted-foreground/60">
            {team.abbr}
          </p>
        </div>
      </div>
      {perQuarter.map((v, i) => (
        <span
          key={i}
          className="text-center font-mono text-sm tabular-nums text-foreground/70"
        >
          {v}
        </span>
      ))}
      <span
        className={`text-right font-mono tabular-nums ${
          winner
            ? "text-2xl font-bold text-foreground"
            : "text-2xl font-semibold text-foreground/55"
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
          <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground/90">
            {status}
          </span>
        </div>

        {/* Header row with quarter labels */}
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
          <TeamRow
            team={away}
            perQuarter={cols.map((c) => c.awayVal)}
            total={score.away.total}
            winner={awayWon}
          />
          <TeamRow
            team={home}
            perQuarter={cols.map((c) => c.homeVal)}
            total={score.home.total}
            winner={homeWon}
          />
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
  const game = (location.state as { game?: NflGame })?.game;

  const awayTeam = getTeam(game?.awayTeam);
  const homeTeam = getTeam(game?.homeTeam);

  const showStatus = game?.status && game.status !== "Scheduled";
  const final = isFinal(game?.status);

  const a = mockMetrics.away;
  const h = mockMetrics.home;

  // Advantages
  const advPpp = compareHigher(a.pointsPerPlay, h.pointsPerPlay);
  const advPapp = compareLower(a.pointsAllowedPerPlay, h.pointsAllowedPerPlay);
  const advThird = compareHigher(a.thirdDownPct, h.thirdDownPct);
  const advRz = compareHigher(a.redZoneTdPct, h.redZoneTdPct);
  const advTo = compareHigher(a.turnoverMargin, h.turnoverMargin);

  // Insight
  const awayWins = [advPpp, advPapp, advThird, advRz, advTo].filter((x) => x === "away").length;
  const homeWins = [advPpp, advPapp, advThird, advRz, advTo].filter((x) => x === "home").length;
  const insight =
    awayWins === homeWins
      ? `${awayTeam.shortName} and ${homeTeam.shortName} grade evenly across core efficiency metrics.`
      : awayWins > homeWins
      ? `${awayTeam.shortName} show stronger efficiency, while ${homeTeam.shortName} hold situational edges.`
      : `${homeTeam.shortName} show stronger efficiency, while ${awayTeam.shortName} create more disruption.`;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-8 gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => {
            // Preserve the date filter the user came from so returning to the
            // games list restores their previous context.
            const search = new URLSearchParams(location.search);
            const stateDate = (location.state as { fromDate?: string } | null)?.fromDate;
            const date = search.get("date") || stateDate;
            navigate(date ? `/?date=${date}` : "/");
          }}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to games
        </Button>

        {/* ── Matchup header ── */}
        <div className="mb-8">
          {game ? (
            <>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                  <TeamLogo team={awayTeam} size={44} />
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground/60">
                      {awayTeam.abbr} · Away
                    </p>
                    <p className="text-base font-semibold text-foreground">{awayTeam.fullName}</p>
                  </div>
                </div>
                <span className="px-1 text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                  at
                </span>
                <div className="flex items-center gap-3">
                  <TeamLogo team={homeTeam} size={44} />
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
                  {game.date} · {game.time}
                </span>
                {game.week && <Badge warm>Week {game.week}</Badge>}
                {showStatus && <Badge accent>{game.status}</Badge>}
                <Badge muted>ID {id}</Badge>
                <a
                  href={espnGameUrl(id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground/70 transition-colors hover:text-primary"
                >
                  View on ESPN
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Understand the matchup
              </p>
            </>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-foreground">Game {id}</h1>
          )}
        </div>

        {/* ── Final Score (only when final) ── */}
        {final && (
          <FinalScoreCard
            away={awayTeam}
            home={homeTeam}
            score={mockFinalScore}
            status={game?.status ?? "Final"}
          />
        )}

        {/* ── Matchup Insight ── */}
        <div className="mb-6 rounded-lg border border-border/60 bg-card/60 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
            <div>
              <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground/70">
                Matchup Insight
              </p>
              <p className="mt-1 text-sm text-foreground/90">{insight}</p>
            </div>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
            TIER 1 — HERO: Team Comparison
            ══════════════════════════════════════════════════ */}
        <section aria-labelledby="team-comparison" className="mb-12">
          <Card className="border-border/80 bg-gradient-to-b from-card to-card/60 shadow-[0_1px_0_0_hsl(var(--border)/0.6),0_20px_40px_-24px_hsl(var(--primary)/0.18)] ring-1 ring-border/40">
            <CardContent className="p-7 sm:p-8">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 ring-1 ring-primary/20">
                    <Swords className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <h2 id="team-comparison" className="text-lg font-semibold leading-tight text-foreground">
                      Team Comparison
                    </h2>
                  </div>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                  Season averages
                </span>
              </div>

              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TeamLogo team={awayTeam} size={26} />
                  <span className="text-sm font-semibold text-foreground">{awayTeam.shortName}</span>
                </div>
                <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">vs</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{homeTeam.shortName}</span>
                  <TeamLogo team={homeTeam} size={26} />
                </div>
              </div>

              <div className="space-y-5">
                <CompareRow
                  label="Points / Play"
                  awayValue={a.pointsPerPlay}
                  homeValue={h.pointsPerPlay}
                  awayDisplay={formatNum(a.pointsPerPlay)}
                  homeDisplay={formatNum(h.pointsPerPlay)}
                  advantage={advPpp}
                  max={Math.max(a.pointsPerPlay, h.pointsPerPlay)}
                />
                <CompareRow
                  label="Pts Allowed / Play"
                  awayValue={a.pointsAllowedPerPlay}
                  homeValue={h.pointsAllowedPerPlay}
                  awayDisplay={formatNum(a.pointsAllowedPerPlay)}
                  homeDisplay={formatNum(h.pointsAllowedPerPlay)}
                  advantage={advPapp}
                  max={Math.max(a.pointsAllowedPerPlay, h.pointsAllowedPerPlay)}
                />
                <CompareRow
                  label="3rd Down %"
                  awayValue={a.thirdDownPct}
                  homeValue={h.thirdDownPct}
                  awayDisplay={`${formatNum(a.thirdDownPct, 1)}%`}
                  homeDisplay={`${formatNum(h.thirdDownPct, 1)}%`}
                  advantage={advThird}
                  max={Math.max(a.thirdDownPct, h.thirdDownPct)}
                />
                <CompareRow
                  label="Red Zone TD %"
                  awayValue={a.redZoneTdPct}
                  homeValue={h.redZoneTdPct}
                  awayDisplay={`${formatNum(a.redZoneTdPct, 1)}%`}
                  homeDisplay={`${formatNum(h.redZoneTdPct, 1)}%`}
                  advantage={advRz}
                  max={Math.max(a.redZoneTdPct, h.redZoneTdPct)}
                />
                <CompareRow
                  label="Turnover Margin"
                  awayValue={a.turnoverMargin}
                  homeValue={h.turnoverMargin}
                  awayDisplay={a.turnoverMargin > 0 ? `+${a.turnoverMargin}` : `${a.turnoverMargin}`}
                  homeDisplay={h.turnoverMargin > 0 ? `+${h.turnoverMargin}` : `${h.turnoverMargin}`}
                  advantage={advTo}
                  max={Math.max(Math.abs(a.turnoverMargin), Math.abs(h.turnoverMargin))}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ══════════════════════════════════════════════════
            TIER 2 — Matchup Breakdown
            ══════════════════════════════════════════════════ */}
        <section aria-labelledby="matchup-breakdown" className="mb-10">
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2
                id="matchup-breakdown"
                className="text-base font-semibold tracking-tight text-foreground"
              >
                Matchup Breakdown
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              {awayTeam.shortName} · {homeTeam.shortName}
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          <Card className="border-border bg-card border-t-2 border-t-accent-cool/45 dark:border-t-accent-cool/40">
            <CardContent className="p-5">
              <SectionHeading icon={Zap} title="Disruption Risk" hint="Defense" />
              <BreakdownHeader awayShort={awayTeam.shortName} homeShort={homeTeam.shortName} />
              <div className="space-y-1.5">
                <BreakdownRow
                  label="Sack Rate"
                  awayDisplay="7.8%"
                  homeDisplay="6.4%"
                  advantage="away"
                />
                <BreakdownRow
                  label="Pressure %"
                  awayDisplay="32.1%"
                  homeDisplay="28.7%"
                  advantage="away"
                />
                <BreakdownRow
                  label="INT Rate"
                  awayDisplay="2.4%"
                  homeDisplay="3.1%"
                  advantage="home"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card border-t-2 border-t-accent-cool/45 dark:border-t-accent-cool/40">
            <CardContent className="p-5">
              <SectionHeading icon={Swords} title="Offensive Strength" hint="Offense" />
              <BreakdownHeader awayShort={awayTeam.shortName} homeShort={homeTeam.shortName} />
              <div className="space-y-1.5">
                <BreakdownRow
                  label="Yds / Play"
                  awayDisplay="5.8"
                  homeDisplay="5.4"
                  advantage="away"
                />
                <BreakdownRow
                  label="EPA / Play"
                  awayDisplay="0.12"
                  homeDisplay="0.08"
                  advantage="away"
                />
                <BreakdownRow
                  label="Explosive %"
                  awayDisplay="11.2%"
                  homeDisplay="12.6%"
                  advantage="home"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card border-t-2 border-t-accent-cool/45 dark:border-t-accent-cool/40">
            <CardContent className="p-5">
              <SectionHeading icon={Shield} title="Defensive Control" hint="Defense" />
              <BreakdownHeader awayShort={awayTeam.shortName} homeShort={homeTeam.shortName} />
              <div className="space-y-1.5">
                <BreakdownRow
                  label="Yds Allowed / P"
                  awayDisplay="5.1"
                  homeDisplay="4.8"
                  advantage="home"
                />
                <BreakdownRow
                  label="Stop Rate"
                  awayDisplay="58.7%"
                  homeDisplay="61.3%"
                  advantage="home"
                />
                <BreakdownRow
                  label="Pts Allowed"
                  awayDisplay="20.4"
                  homeDisplay="18.9"
                  advantage="home"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card border-t-2 border-t-accent-cool/45 dark:border-t-accent-cool/40">
            <CardContent className="p-5">
              <SectionHeading icon={Trophy} title="Finishing Ability" hint="Red zone" />
              <BreakdownHeader awayShort={awayTeam.shortName} homeShort={homeTeam.shortName} />
              <div className="space-y-1.5">
                <BreakdownRow
                  label="RZ TD %"
                  awayDisplay={`${formatNum(a.redZoneTdPct, 1)}%`}
                  homeDisplay={`${formatNum(h.redZoneTdPct, 1)}%`}
                  advantage={advRz}
                />
                <BreakdownRow
                  label="Goal-to-Go %"
                  awayDisplay="72.1%"
                  homeDisplay="78.4%"
                  advantage="home"
                />
                <BreakdownRow
                  label="4th Down %"
                  awayDisplay="54.2%"
                  homeDisplay="48.1%"
                  advantage="away"
                />
              </div>
            </CardContent>
          </Card>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════
            TIER 3 — Game Drivers (supporting)
            ══════════════════════════════════════════════════ */}
        <section aria-labelledby="game-drivers" className="mb-10">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2
                id="game-drivers"
                className="text-sm font-semibold tracking-tight text-foreground/90"
              >
                Game Drivers
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              Recent tendencies
            </span>
          </div>
          {(() => {
            const a = mockMetrics.away;
            const h = mockMetrics.home;
            const topToSec = (t: string) => {
              const [m, s] = t.split(":").map(Number);
              return (m || 0) * 60 + (s || 0);
            };
            const edge = (av: number, hv: number, tol = 0): Advantage => {
              if (Math.abs(av - hv) <= tol) return "even";
              return av > hv ? "away" : "home";
            };
            const advRz = edge(a.redZoneTdPct, h.redZoneTdPct, 1);
            const advThird = edge(a.thirdDownPct, h.thirdDownPct, 1);
            const advTo = edge(a.turnoverMargin, h.turnoverMargin, 0);
            const advTop = edge(topToSec(a.timeOfPossession), topToSec(h.timeOfPossession), 30);

            const fmtTo = (v: number) => (v > 0 ? `+${v}` : `${v}`);

            const rows: { label: string; away: string; home: string; adv: Advantage }[] = [
              { label: "Red Zone TD %", away: `${formatNum(a.redZoneTdPct, 1)}%`, home: `${formatNum(h.redZoneTdPct, 1)}%`, adv: advRz },
              { label: "3rd Down %", away: `${formatNum(a.thirdDownPct, 1)}%`, home: `${formatNum(h.thirdDownPct, 1)}%`, adv: advThird },
              { label: "Turnover Margin", away: fmtTo(a.turnoverMargin), home: fmtTo(h.turnoverMargin), adv: advTo },
              { label: "Time of Poss.", away: a.timeOfPossession, home: h.timeOfPossession, adv: advTop },
            ];

            const valueCls = (side: "away" | "home", adv: Advantage) =>
              adv === side
                ? "text-foreground font-semibold"
                : adv === "even"
                ? "text-foreground/75"
                : "text-foreground/45";

            return (
              <Card className="border-border bg-card">
                <CardContent className="p-5 sm:p-6">
                  {/* Column headers — anchored left/right */}
                  <div className="mb-3 grid grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-border/60 pb-3">
                    <div className="flex items-center gap-2.5">
                      <TeamLogo team={awayTeam} size={20} />
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {awayTeam.shortName}
                      </span>
                    </div>
                    <span className="px-2 text-center text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground/50">
                      vs
                    </span>
                    <div className="flex items-center justify-end gap-2.5">
                      <span className="text-sm font-semibold tracking-tight text-foreground">
                        {homeTeam.shortName}
                      </span>
                      <TeamLogo team={homeTeam} size={20} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    {rows.map((r) => (
                      <div
                        key={r.label}
                        className="-mx-2 grid grid-cols-[1fr_auto_1fr] items-center gap-4 rounded-md px-2 py-3.5 transition-all duration-150 hover:bg-muted/70 hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.22)] dark:hover:bg-muted/40 dark:hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.32)]"
                      >
                        <span className={`text-left font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("away", r.adv)}`}>
                          {r.away}
                        </span>
                        <span className="px-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/85">
                          {r.label}
                        </span>
                        <span className={`text-right font-mono text-sm tabular-nums transition-colors duration-150 ${valueCls("home", r.adv)}`}>
                          {r.home}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })()}
        </section>

        {/* ══════════════════════════════════════════════════
            TIER 4 — Recent Form (context)
            ══════════════════════════════════════════════════ */}
        <section aria-labelledby="recent-form">
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2
                id="recent-form"
                className="text-sm font-semibold tracking-tight text-foreground/80"
              >
                Recent Form
              </h2>
            </div>
            <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
              Last 5 Games
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
          {(["away", "home"] as const).map((side) => {
            const games = mockRecent[side];
            const team = side === "away" ? awayTeam : homeTeam;
            return (
              <Card key={side} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center gap-2.5">
                    <TeamLogo team={team} size={24} />
                    <span className="text-sm font-semibold text-foreground">
                      {team.location} {team.shortName}
                    </span>
                  </div>
                  <ul className="space-y-0.5">
                    {games.map((g, i) => (
                      <li
                        key={i}
                        className="group flex items-center justify-between rounded-md px-2 py-2 text-xs transition-all duration-150 hover:bg-muted/70 hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.22)] dark:hover:bg-muted/40 dark:hover:shadow-[inset_0_0_0_1px_hsl(var(--accent-cool)/0.32)]"
                      >
                        <div className="flex items-center gap-2.5">
                          <ResultDot result={g.result} />
                          <span className="text-muted-foreground/70">{g.home ? "vs" : "@"}</span>
                          <span className="font-medium text-foreground">{getTeam(g.opponent).shortName}</span>
                        </div>
                        <span className="font-mono text-foreground/75 transition-colors duration-150 group-hover:text-foreground">
                          {g.score}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
