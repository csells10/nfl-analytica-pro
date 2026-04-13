import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronRight, Clock, Tv } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { gameDates, getGamesForDate, type SlateGame } from "@/lib/sample-data";

function MatchupCard({ game }: { game: SlateGame }) {
  return (
    <button
      className="group relative w-full overflow-hidden rounded-xl border border-border/60 bg-card p-5 text-left transition-all duration-200 hover:border-primary/40 hover:bg-card/80 hover:shadow-lg hover:shadow-primary/5"
      onClick={() => {
        // Future: navigate to matchup lens
      }}
    >
      {/* Subtle left accent */}
      <div className="absolute inset-y-0 left-0 w-[3px] rounded-full bg-primary/20 transition-colors group-hover:bg-primary/60" />

      <div className="flex items-center justify-between pl-3">
        {/* Teams */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
              {game.awayTeam}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">at</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary text-xs font-bold text-foreground">
              {game.homeTeam}
            </div>
          </div>
        </div>

        {/* Meta + Arrow */}
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3 text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              <span className="text-xs">{game.time}</span>
            </div>
            {game.network && (
              <div className="flex items-center gap-1.5">
                <Tv className="h-3 w-3" />
                <span className="rounded-md bg-secondary px-2 py-0.5 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {game.network}
                </span>
              </div>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-primary" />
        </div>
      </div>
    </button>
  );
}

export default function Slate() {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    parseISO("2025-01-05")
  );

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";
  const games = dateStr ? getGamesForDate(dateStr) : [];

  const gameDateSet = new Set(gameDates);
  const modifiers = {
    hasGames: (date: Date) => gameDateSet.has(format(date, "yyyy-MM-dd")),
  };
  const modifiersClassNames = {
    hasGames: "underline decoration-primary decoration-2 underline-offset-4",
  };

  // Group games by time slot
  const gamesByTime = games.reduce<Record<string, SlateGame[]>>((acc, game) => {
    if (!acc[game.time]) acc[game.time] = [];
    acc[game.time].push(game);
    return acc;
  }, {});

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-10 py-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Game Slate
          </h1>
          <p className="text-sm text-muted-foreground">
            Pick a date to browse matchups and open detailed analysis.
          </p>
        </div>

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "h-11 w-[260px] justify-start gap-2.5 rounded-lg border-border/60 text-left font-normal transition-colors hover:border-primary/40",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              {selectedDate
                ? format(selectedDate, "EEEE, MMM d, yyyy")
                : "Pick a date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersClassNames={modifiersClassNames}
              initialFocus
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>

        {/* Games list */}
        {selectedDate && (
          <div className="space-y-6">
            {games.length > 0 ? (
              <>
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {format(selectedDate, "EEEE, MMMM d")}
                  </p>
                  <div className="h-px flex-1 bg-border/40" />
                  <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-semibold text-muted-foreground">
                    {games.length} game{games.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {Object.entries(gamesByTime).map(([time, timeGames]) => (
                  <div key={time} className="space-y-2.5">
                    {timeGames.map((game) => (
                      <MatchupCard key={game.id} game={game} />
                    ))}
                  </div>
                ))}
              </>
            ) : (
              <div className="flex flex-col items-center gap-2 py-20">
                <CalendarIcon className="h-8 w-8 text-muted-foreground/30" />
                <p className="text-sm text-muted-foreground">
                  No games scheduled for this date.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
