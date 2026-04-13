import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronRight } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { gameDates, getGamesForDate, type SlateGame } from "@/lib/sample-data";

function MatchupCard({ game }: { game: SlateGame }) {
  return (
    <button
      className="group w-full rounded-lg border border-border bg-card px-5 py-4 text-left transition-colors hover:border-primary/30 hover:bg-secondary/50"
      onClick={() => {
        // Future: navigate to matchup lens
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Away */}
          <span className="w-10 text-sm font-semibold text-foreground">{game.awayTeam}</span>
          <span className="text-xs text-muted-foreground">@</span>
          {/* Home */}
          <span className="w-10 text-sm font-semibold text-foreground">{game.homeTeam}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{game.time}</span>
            {game.network && (
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px] font-medium text-muted-foreground">
                {game.network}
              </span>
            )}
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
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

  // Highlight dates that have games
  const gameDateSet = new Set(gameDates);
  const modifiers = {
    hasGames: (date: Date) => gameDateSet.has(format(date, "yyyy-MM-dd")),
  };
  const modifiersClassNames = {
    hasGames: "underline decoration-primary decoration-2 underline-offset-4",
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-8 py-4">
        {/* Header */}
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-foreground">Game Slate</h1>
          <p className="text-sm text-muted-foreground">
            Select a date to view matchups
          </p>
        </div>

        {/* Date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-[220px] justify-start text-left font-normal",
                !selectedDate && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {selectedDate ? format(selectedDate, "EEEE, MMM d, yyyy") : "Pick a date"}
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
          <div className="space-y-3">
            {games.length > 0 ? (
              <>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {games.length} game{games.length !== 1 ? "s" : ""} — {format(selectedDate, "EEEE, MMMM d")}
                </p>
                <div className="space-y-2">
                  {games.map((game) => (
                    <MatchupCard key={game.id} game={game} />
                  ))}
                </div>
              </>
            ) : (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No games scheduled for this date.
              </p>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
