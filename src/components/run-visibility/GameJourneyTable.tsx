import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusChip from "./StatusChip";
import type { GameRow } from "@/lib/run-visibility";

interface Props {
  games: GameRow[];
  onOpenGame: (gameId: string) => void;
}

export default function GameJourneyTable({ games, onOpenGame }: Props) {
  if (games.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No scheduled games in this selection.
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      {/* Desktop / tablet */}
      <Card className="hidden border-border bg-card md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Game / Matchup</TableHead>
                  <TableHead className="min-w-[150px]">Kickoff</TableHead>
                  <TableHead>Overall State</TableHead>
                  <TableHead>Daily Data Load</TableHead>
                  <TableHead>GameLens Pregame</TableHead>
                  <TableHead>Postgame Learning</TableHead>
                  <TableHead className="min-w-[220px]">First Issue</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.game_id} className="align-top">
                    <TableCell>
                      <p className="font-medium text-foreground">{game.matchup}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{game.game_id}</p>
                      <p className="text-[11px] text-muted-foreground">{game.week_label}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{game.kickoff_label}</TableCell>
                    <TableCell>
                      <StatusChip {...game.overall} />
                    </TableCell>
                    <TableCell>
                      <StatusChip {...game.daily_data_load} />
                    </TableCell>
                    <TableCell>
                      <StatusChip {...game.gamelens_pregame} />
                    </TableCell>
                    <TableCell>
                      <StatusChip {...game.postgame_learning} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{game.first_issue ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => onOpenGame(game.game_id)}>
                        Details
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Mobile */}
      <div className="space-y-3 md:hidden">
        {games.map((game) => (
          <Card key={game.game_id} className="border-border bg-card">
            <CardContent className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{game.matchup}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{game.game_id}</p>
                  <p className="text-[11px] text-muted-foreground">{game.kickoff_label}</p>
                </div>
                <StatusChip {...game.overall} />
              </div>
              <div className="grid grid-cols-1 gap-2 text-xs xs:grid-cols-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Daily load</span>
                  <StatusChip {...game.daily_data_load} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Pregame</span>
                  <StatusChip {...game.gamelens_pregame} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Postgame</span>
                  <StatusChip {...game.postgame_learning} />
                </div>
              </div>
              {game.first_issue && <p className="text-xs text-muted-foreground">{game.first_issue}</p>}
              <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenGame(game.game_id)}>
                View details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  );
}
