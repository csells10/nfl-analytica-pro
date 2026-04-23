import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CalendarIcon, ChevronRight, Loader2 } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNflSchedule, type NflGame } from "@/lib/nfl-api";
import DateSelectionModal from "@/components/DateSelectionModal";

const ONBOARDING_KEY = "gamelens_date_guide_completed";

function MatchupCard({ game, dateParam }: { game: NflGame; dateParam?: string }) {
  const navigate = useNavigate();

  return (
    <button
      className="group w-full rounded-lg border border-border bg-card text-left transition-all duration-150 hover:border-primary/30 hover:bg-secondary/30"
      onClick={() =>
        navigate(`/matchup/${game.id}${dateParam ? `?date=${dateParam}` : ""}`, {
          state: { game, fromDate: dateParam },
        })
      }
    >
      <div className="flex items-center justify-between px-5 py-3.5">
        {/* Teams */}
        <div className="flex items-center gap-3">
          <span className="inline-flex h-8 w-12 items-center justify-center rounded bg-secondary text-xs font-semibold tracking-wide text-foreground">
            {game.awayTeam}
          </span>
          <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
            at
          </span>
          <span className="inline-flex h-8 w-12 items-center justify-center rounded bg-secondary text-xs font-semibold tracking-wide text-foreground">
            {game.homeTeam}
          </span>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4">
          <div className="hidden items-center gap-2.5 text-xs text-muted-foreground sm:flex">
            <span>{game.date}</span>
            <span className="text-border">·</span>
            <span>{game.time}</span>
            {game.week && (
              <span className="rounded border border-border px-1.5 py-px font-mono text-[10px] font-medium text-muted-foreground">
                Wk {game.week}
              </span>
            )}
            {game.status && game.status !== "Scheduled" && (
              <span className="text-[10px] text-muted-foreground/70 italic">
                {game.status}
              </span>
            )}
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/50 transition-all duration-150 group-hover:text-primary group-hover:translate-x-0.5" />
        </div>
      </div>
    </button>
  );
}

export default function Slate() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selected date from `?date=YYYY-MM-DD` URL param so deep links
  // and back-navigation from the Matchup page restore the previous filter.
  const initialDate = useMemo(() => {
    const raw = searchParams.get("date");
    if (!raw) return undefined;
    // Parse as local date to avoid timezone drift (YYYY-MM-DD).
    const [y, m, d] = raw.split("-").map(Number);
    if (!y || !m || !d) return undefined;
    const parsed = new Date(y, m - 1, d);
    return isNaN(parsed.getTime()) ? undefined : parsed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [overlayOpen, setOverlayOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (initialDate) return false;
    return localStorage.getItem(ONBOARDING_KEY) !== "true";
  });

  const { data: games, isLoading, isError, error } = useNflSchedule(selectedDate);

  const dateParam = selectedDate ? format(selectedDate, "yyyy-MM-dd") : undefined;

  const completeOnboarding = () => {
    try {
      localStorage.setItem(ONBOARDING_KEY, "true");
    } catch {
      /* ignore */
    }
    setOverlayOpen(false);
  };

  const handleSelectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setSearchParams({ date: format(date, "yyyy-MM-dd") }, { replace: true });
      completeOnboarding();
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  return (
    <AppShell>
      <DateSelectionModal
        open={overlayOpen}
        onDismiss={completeOnboarding}
        targetSelector="[data-onboarding='game-date']"
      />
      <div className="mx-auto max-w-2xl py-8">
        {/* Header + date picker */}
        <div className="mb-10 space-y-5">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Matchups
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Pick a date to understand the matchups ahead.
            </p>
          </div>

          <div>
            <label className="block mb-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              Game date
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  data-onboarding="game-date"
                  variant="outline"
                  className={cn(
                    "h-10 w-[260px] justify-start gap-2 rounded-lg font-normal relative z-[60]",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                  {selectedDate
                    ? format(selectedDate, "EEEE, MMM d, yyyy")
                    : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 z-[70]" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={handleSelectDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content states */}
        {selectedDate && (
          <>
            {isLoading && (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <span className="ml-3 text-sm text-muted-foreground">
                  Loading schedule…
                </span>
              </div>
            )}

            {isError && (
              <div className="py-16 text-center">
                <p className="text-sm text-destructive">
                  Unable to load the schedule.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {(error as Error)?.message || "Please try again later."}
                </p>
              </div>
            )}

            {!isLoading && !isError && games && games.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No games scheduled for this date.
              </p>
            )}

            {!isLoading && !isError && games && games.length > 0 && (
              <div className="space-y-6">
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
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
