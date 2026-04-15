import { useParams, useNavigate, useLocation } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Construction } from "lucide-react";
import type { NflGame } from "@/lib/nfl-api";

export default function Matchup() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const game = (location.state as { game?: NflGame })?.game;

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-6 gap-1.5 text-muted-foreground hover:text-foreground"
          onClick={() => navigate("/")}
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Slate
        </Button>

        {/* Matchup header */}
        {game ? (
          <div className="mb-8 space-y-1.5">
            <h1 className="text-xl font-bold tracking-tight text-foreground">
              {game.awayTeam}{" "}
              <span className="text-muted-foreground font-medium">at</span>{" "}
              {game.homeTeam}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{game.date}</span>
              <span className="text-border">·</span>
              <span>{game.time}</span>
              {game.week && (
                <>
                  <span className="text-border">·</span>
                  <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] font-medium">
                    Week {game.week}
                  </span>
                </>
              )}
              {game.status && game.status !== "Scheduled" && (
                <>
                  <span className="text-border">·</span>
                  <span className="italic text-muted-foreground/70">{game.status}</span>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground/50 font-mono">
              Game {id}
            </p>
          </div>
        ) : (
          <h1 className="text-lg font-bold tracking-tight text-foreground mb-6">
            Matchup — Game {id}
          </h1>
        )}

        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Construction className="mb-3 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Detailed matchup analysis coming next.
            </p>
            <p className="mt-1 text-xs text-muted-foreground/70">
              Team comparisons, key stats, and game context will appear here.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
