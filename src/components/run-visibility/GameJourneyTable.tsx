import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import StatusChip from "./StatusChip";
import JourneyTicks from "./JourneyTicks";
import type { GameRow } from "@/lib/run-visibility";

interface Props {
  games: GameRow[];
  dayLabel: string;
  onOpenGame: (gameId: string) => void;
}

/** Games for one selected day. Detailed stage colour lives in the drawer. */
export default function GameJourneyTable({ games, dayLabel, onOpenGame }: Props) {
  if (games.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          No scheduled games on this day.
        </CardContent>
      </Card>
    );
  }

  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-foreground">
        {dayLabel} <span className="font-normal text-muted-foreground">· {games.length} games</span>
      </h3>

      {/* Desktop / tablet */}
      <Card className="hidden border-border bg-card md:block">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[180px]">Game / Matchup</TableHead>
                  <TableHead className="min-w-[110px]">Kickoff</TableHead>
                  <TableHead className="min-w-[140px]">Overall State</TableHead>
                  <TableHead className="min-w-[280px]">Journey</TableHead>
                  <TableHead className="min-w-[220px]">First issue or known gap</TableHead>
                  <TableHead className="text-right">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {games.map((game) => (
                  <TableRow key={game.game_id} className="align-top">
                    <TableCell>
                      <p className="font-medium text-foreground">{game.matchup}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{game.game_id}</p>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{game.kickoff_time_label}</TableCell>
                    <TableCell>
                      <StatusChip {...game.overall} quiet />
                    </TableCell>
                    <TableCell>
                      <JourneyTicks game={game} />
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
                  <p className="text-[11px] text-muted-foreground">{game.kickoff_time_label}</p>
                </div>
                <StatusChip {...game.overall} quiet />
              </div>
              <JourneyTicks game={game} />
              {game.first_issue && <p className="text-xs text-muted-foreground">{game.first_issue}</p>}
              <Button variant="outline" size="sm" className="w-full" onClick={() => onOpenGame(game.game_id)}>
                View details
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
