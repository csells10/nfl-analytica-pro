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
} from "lucide-react";
import type { NflGame } from "@/lib/nfl-api";

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
  score: string; // "24-17"
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
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
        <Icon className="h-3.5 w-3.5 text-primary" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {hint && (
        <span className="ml-auto text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
          {hint}
        </span>
      )}
    </div>
  );
}

/**
 * Horizontal comparison row — two values diverging from a center axis.
 * The team with the advantage gets the primary color; the other is muted.
 */
function CompareRow({
  label,
  awayValue,
  homeValue,
  awayDisplay,
  homeDisplay,
  advantage,
  // for bar fill — both values normalized against max
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
    advantage === "away"
      ? "bg-primary"
      : advantage === "home"
      ? "bg-secondary"
      : "bg-muted-foreground/40";
  const homeBar =
    advantage === "home"
      ? "bg-primary"
      : advantage === "away"
      ? "bg-secondary"
      : "bg-muted-foreground/40";

  const awayText =
    advantage === "away" ? "text-primary" : "text-foreground/80";
  const homeText =
    advantage === "home" ? "text-primary" : "text-foreground/80";

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        <span className={`font-mono text-xs normal-case tracking-normal ${awayText}`}>
          {awayDisplay}
        </span>
        <span>{label}</span>
        <span className={`font-mono text-xs normal-case tracking-normal ${homeText}`}>
          {homeDisplay}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        {/* Away bar — fills right→left */}
        <div className="flex h-1.5 flex-1 justify-end overflow-hidden rounded-full bg-secondary/50">
          <div
            className={`h-full rounded-full ${awayBar} transition-all`}
            style={{ width: `${awayPct}%` }}
          />
        </div>
        <div className="h-2.5 w-px bg-border" />
        {/* Home bar — fills left→right */}
        <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-secondary/50">
          <div
            className={`h-full rounded-full ${homeBar} transition-all`}
            style={{ width: `${homePct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function StatLine({
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
  return (
    <div className="flex items-center justify-between border-b border-border/40 py-2 text-xs last:border-0">
      <span
        className={`w-14 font-mono text-right ${
          advantage === "away" ? "text-primary" : "text-foreground/80"
        }`}
      >
        {awayDisplay}
      </span>
      <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
        {label}
      </span>
      <span
        className={`w-14 font-mono ${
          advantage === "home" ? "text-primary" : "text-foreground/80"
        }`}
      >
        {homeDisplay}
      </span>
    </div>
  );
}

function ResultDot({ result }: { result: "W" | "L" }) {
  return (
    <span
      className={`inline-flex h-5 w-5 items-center justify-center rounded-md text-[10px] font-bold ${
        result === "W"
          ? "bg-primary/15 text-primary"
          : "bg-destructive/15 text-destructive"
      }`}
    >
      {result}
    </span>
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

  const showStatus = game?.status && game.status !== "Scheduled";

  const awayLabel = game?.awayTeam ?? "AWAY";
  const homeLabel = game?.homeTeam ?? "HOME";

  const a = mockMetrics.away;
  const h = mockMetrics.home;

  // Advantages
  const advPpp = compareHigher(a.pointsPerPlay, h.pointsPerPlay);
  const advPapp = compareLower(a.pointsAllowedPerPlay, h.pointsAllowedPerPlay);
  const advThird = compareHigher(a.thirdDownPct, h.thirdDownPct);
  const advRz = compareHigher(a.redZoneTdPct, h.redZoneTdPct);
  const advTo = compareHigher(a.turnoverMargin, h.turnoverMargin);

  // Insight line — quick heuristic
  const awayWins =
    [advPpp, advPapp, advThird, advRz, advTo].filter((x) => x === "away").length;
  const homeWins =
    [advPpp, advPapp, advThird, advRz, advTo].filter((x) => x === "home").length;
  const insight =
    awayWins === homeWins
      ? `${awayLabel} and ${homeLabel} grade evenly across core efficiency metrics.`
      : awayWins > homeWins
      ? `${awayLabel} shows stronger efficiency, while ${homeLabel} holds situational edges.`
      : `${homeLabel} shows stronger efficiency, while ${awayLabel} creates more disruption.`;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-8 gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to games
        </Button>

        {/* ── Matchup header ── */}
        <div className="mb-8">
          {game ? (
            <>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-16 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold tracking-wide text-primary">
                  {awayLabel}
                </span>
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                  at
                </span>
                <span className="inline-flex h-10 w-16 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold tracking-wide text-primary">
                  {homeLabel}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {game.date} · {game.time}
                </span>
                {game.week && <Badge warm>Week {game.week}</Badge>}
                {showStatus && <Badge accent>{game.status}</Badge>}
                <Badge muted>ID {id}</Badge>
              </div>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground/70">
                Understand the matchup
              </p>
            </>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Game {id}
            </h1>
          )}
        </div>

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

        {/* ── HERO: Team Comparison ── */}
        <Card className="mb-6 border-border bg-card">
          <CardContent className="p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
                  <Swords className="h-3.5 w-3.5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold text-foreground">
                  Team Comparison
                </h3>
              </div>
              <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                Season averages
              </span>
            </div>

            <div className="mb-5 flex items-center justify-between text-xs font-semibold tracking-wide">
              <span className="text-foreground">{awayLabel}</span>
              <span className="text-muted-foreground/60">vs</span>
              <span className="text-foreground">{homeLabel}</span>
            </div>

            <div className="space-y-4">
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

        {/* ── Matchup Breakdown ── */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Matchup Breakdown
          </h2>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <SectionHeading icon={Zap} title="Disruption Risk" hint="Defense" />
              <div className="space-y-1">
                <StatLine label="Sack Rate" awayDisplay="7.8%" homeDisplay="6.4%" advantage="away" />
                <StatLine label="Pressure %" awayDisplay="32.1%" homeDisplay="28.7%" advantage="away" />
                <StatLine label="INT Rate" awayDisplay="2.4%" homeDisplay="3.1%" advantage="home" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <SectionHeading icon={Swords} title="Offensive Strength" hint="Offense" />
              <div className="space-y-1">
                <StatLine label="Yds / Play" awayDisplay="5.8" homeDisplay="5.4" advantage="away" />
                <StatLine label="EPA / Play" awayDisplay="0.12" homeDisplay="0.08" advantage="away" />
                <StatLine label="Explosive %" awayDisplay="11.2%" homeDisplay="12.6%" advantage="home" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <SectionHeading icon={Shield} title="Defensive Control" hint="Defense" />
              <div className="space-y-1">
                <StatLine label="Yds Allowed / P" awayDisplay="5.1" homeDisplay="4.8" advantage="home" />
                <StatLine label="Stop Rate" awayDisplay="58.7%" homeDisplay="61.3%" advantage="home" />
                <StatLine label="Pts Allowed" awayDisplay="20.4" homeDisplay="18.9" advantage="home" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardContent className="p-5">
              <SectionHeading icon={Trophy} title="Finishing Ability" hint="Red zone" />
              <div className="space-y-1">
                <StatLine
                  label="RZ TD %"
                  awayDisplay={`${formatNum(a.redZoneTdPct, 1)}%`}
                  homeDisplay={`${formatNum(h.redZoneTdPct, 1)}%`}
                  advantage={advRz}
                />
                <StatLine label="Goal-to-Go %" awayDisplay="72.1%" homeDisplay="78.4%" advantage="home" />
                <StatLine label="4th Down %" awayDisplay="54.2%" homeDisplay="48.1%" advantage="away" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Game Drivers ── */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Game Drivers
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Recent tendencies
          </span>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {(["away", "home"] as const).map((side) => {
            const m = mockMetrics[side];
            const label = side === "away" ? awayLabel : homeLabel;
            return (
              <Card key={side} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-7 min-w-[3.5rem] items-center justify-center rounded-md bg-primary/15 px-2 text-xs font-bold text-primary">
                      {label}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
                      Last 5 games
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        Red Zone TD %
                      </p>
                      <p className="mt-1 font-mono text-lg text-foreground">
                        {formatNum(m.redZoneTdPct, 1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        3rd Down %
                      </p>
                      <p className="mt-1 font-mono text-lg text-foreground">
                        {formatNum(m.thirdDownPct, 1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        Turnover Margin
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-mono text-lg text-foreground">
                        {m.turnoverMargin > 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        ) : m.turnoverMargin < 0 ? (
                          <TrendingDown className="h-3.5 w-3.5 text-destructive" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                        {m.turnoverMargin > 0 ? `+${m.turnoverMargin}` : m.turnoverMargin}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/70">
                        Time of Poss.
                      </p>
                      <p className="mt-1 font-mono text-lg text-foreground">
                        {m.timeOfPossession}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* ── Recent Form ── */}
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
            Recent Form
          </h2>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Last 5 · most recent left
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {(["away", "home"] as const).map((side) => {
            const games = mockRecent[side];
            const label = side === "away" ? awayLabel : homeLabel;
            const wins = games.filter((g) => g.result === "W").length;
            return (
              <Card key={side} className="border-border bg-card">
                <CardContent className="p-5">
                  <div className="mb-4 flex items-center justify-between">
                    <span className="inline-flex h-7 min-w-[3.5rem] items-center justify-center rounded-md bg-primary/15 px-2 text-xs font-bold text-primary">
                      {label}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      {wins}-{games.length - wins}
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {games.map((g, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between border-b border-border/40 py-2 text-xs last:border-0"
                      >
                        <div className="flex items-center gap-2.5">
                          <ResultDot result={g.result} />
                          <span className="text-muted-foreground/70">
                            {g.home ? "vs" : "@"}
                          </span>
                          <span className="font-medium text-foreground">
                            {g.opponent}
                          </span>
                        </div>
                        <span className="font-mono text-foreground/80">
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
      </div>
    </AppShell>
  );
}
