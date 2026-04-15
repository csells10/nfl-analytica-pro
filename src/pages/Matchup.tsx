import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  BarChart3,
  GitCompareArrows,
  LayoutGrid,
  Target,
} from "lucide-react";
import type { NflGame } from "@/lib/nfl-api";

function Badge({ children, muted, accent }: { children: React.ReactNode; muted?: boolean; accent?: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium tracking-wide ${
        accent
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

function PlaceholderSection({
  icon: Icon,
  title,
  description,
  rows = 3,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  rows?: number;
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="p-5">
        <div className="mb-4 flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-3.5 w-3.5 text-primary" />
          </div>
          <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        </div>
        <div className="space-y-2.5">
          {Array.from({ length: rows }).map((_, i) => (
            <div
              key={i}
              className="h-2.5 rounded-full bg-secondary/80"
              style={{ width: `${70 - i * 12}%` }}
            />
          ))}
        </div>
        <p className="mt-4 text-[11px] text-muted-foreground/50">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function Matchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const game = (location.state as { game?: NflGame })?.game;

  const showStatus = game?.status && game.status !== "Scheduled";

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
          Back to Slate
        </Button>

        {/* ── Matchup header ── */}
        <div className="mb-10">
          {game ? (
            <>
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-16 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold tracking-wide text-primary">
                  {game.awayTeam}
                </span>
                <span className="text-xs font-medium uppercase tracking-widest text-muted-foreground/60">
                  at
                </span>
                <span className="inline-flex h-10 w-16 items-center justify-center rounded-lg bg-primary/15 text-sm font-bold tracking-wide text-primary">
                  {game.homeTeam}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {game.date} · {game.time}
                </span>
                {game.week && <Badge accent>Week {game.week}</Badge>}
                {showStatus && <Badge accent>{game.status}</Badge>}
                <Badge muted>ID {id}</Badge>
              </div>
            </>
          ) : (
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              Game {id}
            </h1>
          )}
        </div>

        {/* ── Analysis grid ── */}
        <div className="grid gap-4 sm:grid-cols-2">
          <PlaceholderSection
            icon={GitCompareArrows}
            title="Team Comparison"
            description="Head-to-head season stats and recent form."
            rows={4}
          />
          <PlaceholderSection
            icon={LayoutGrid}
            title="Core Area Scores"
            description="Offense, defense, and special teams grades."
            rows={3}
          />
          <PlaceholderSection
            icon={BarChart3}
            title="Key Stats"
            description="Yards, turnovers, third-down rate, and red-zone efficiency."
            rows={4}
          />
          <PlaceholderSection
            icon={Target}
            title="Betting Lens"
            description="Spread movement, totals, and value indicators."
            rows={3}
          />
        </div>
      </div>
    </AppShell>
  );
}
