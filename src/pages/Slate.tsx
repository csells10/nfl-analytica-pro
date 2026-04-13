import { useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, ChevronRight } from "lucide-react";
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
      className="group w-full rounded-lg border border-border bg-card text-left transition-all duration-150 hover:border-primary/30 hover:shadow-md hover:shadow-black/20"
      onClick={() => {}}
    >
      <div className="flex items-center justify-between px-5 py-4">
        {/* Teams */}
        <div className="flex items-center gap-4 min-w-0">
          <span className="inline-flex h-8 w-12 items-center justify-center rounded bg-secondary text-xs font-bold tracking-wide text-foreground">
            {game.awayTeam}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            @
          </span>
          <span className="inline-flex h-8 w-12 items-center justify-center rounded bg-secondary text-xs font-bold tracking-wide text-foreground">
            {game.homeTeam}
          </span>
        </div>

        {/* Right side: time, network, action */}
        <div className="flex items-center gap-6">
          <div className="hidden items-center gap-3 text-xs text-muted-foreground sm:flex">
            <span>{game.time}</span>
            {game.network && (
              <span className="rounded border border-border bg-muted/50 px-1.5 py-px font-mono text-[10px] font-medium">
                {game.network}
              </span>
            )}
          </div>
          <span className="flex items-center gap-1 text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-primary">
            Open
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-150 group-hover:translate-x-0.5" />
          </span>
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

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl py-8">
        {/* Header + date picker */}
        <div className="mb-10 space-y-5">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Game Slate
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Select a date, then open a matchup to begin analysis.
            </p>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "h-10 w-[260px] justify-start gap-2 rounded-lg font-normal",
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
        </div>

        {/* Game list */}
        {selectedDate && (
          <>
            {games.length > 0 ? (
              <div className="space-y-6">
                {/* Section label */}
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {format(selectedDate, "MMMM d, yyyy")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {games.length} game{games.length !== 1 && "s"}
                  </span>
                </div>

                <div className="space-y-2">
                  {games.map((game) => (
                    <MatchupCard key={game.id} game={game} />
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No games scheduled for this date.
              </p>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
