import { forwardRef, useState, useMemo, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useNavigate, useSearchParams } from "react-router-dom";
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
import { useNflSchedule, userMessageForError, type NflGame } from "@/lib/nfl-api";
import DateSelectionModal from "@/components/DateSelectionModal";
import { perfMark } from "@/lib/perf";

const ONBOARDING_KEY = "hasSeenDateTutorial";
const GUIDE_EVENT = "gamelens:open-guide";
// Module-eval marker — fires when the lazy Slate chunk finishes parsing.
perfMark("Slate module evaluated");

const MatchupCard = forwardRef<HTMLButtonElement, { game: NflGame; dateParam?: string }>(
  function MatchupCard({ game, dateParam }, ref) {
    const navigate = useNavigate();

    return (
      <button
        ref={ref}
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
  },
);
MatchupCard.displayName = "MatchupCard";

export default function Slate() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Initialize selected date from `?date=YYYY-MM-DD` URL param so deep links
  // and back-navigation from the Matchup page restore the previous filter.
  // Resolve the initial date once on mount:
  //   1. `?date=YYYY-MM-DD` URL param (deep links / back-nav) wins.
  //   2. Otherwise default to today so the slate loads immediately.
  const { initialDate, dateFromUrl } = useMemo(() => {
    const raw = searchParams.get("date");
    if (raw) {
      const [y, m, d] = raw.split("-").map(Number);
      if (y && m && d) {
        const parsed = new Date(y, m - 1, d);
        if (!isNaN(parsed.getTime())) {
          return { initialDate: parsed, dateFromUrl: true };
        }
      }
    }
    return { initialDate: new Date(), dateFromUrl: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const [overlayOpen, setOverlayOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    if (dateFromUrl) return false;
    return localStorage.getItem(ONBOARDING_KEY) !== "true";
  });

  // Controls the date-picker popover so we can auto-close it on selection.
  const [datePickerOpen, setDatePickerOpen] = useState(false);

  // Listen for the global "open guide" event from the AppShell button.
  useEffect(() => {
    const handler = () => setOverlayOpen(true);
    window.addEventListener(GUIDE_EVENT, handler);
    return () => window.removeEventListener(GUIDE_EVENT, handler);
  }, []);

  const {
    data: games,
    isLoading,
    isFetching,
    isError,
    error,
  } = useNflSchedule(selectedDate);
  // Cold load = no cached data yet. Background refresh = have data but refetching.
  const isColdLoad = isLoading && !games;
  const isBackgroundRefresh = isFetching && !isColdLoad && !!games;
  const showStaleWarning = isError && !!games;


  // Render-time mount marker (fires on the first render, before effects).
  const renderLoggedRef = useRef(false);
  if (!renderLoggedRef.current) {
    renderLoggedRef.current = true;
    perfMark("Slate first render");
  }
  const dataPaintLoggedRef = useRef(false);
  useEffect(() => {
    if (games && !dataPaintLoggedRef.current) {
      dataPaintLoggedRef.current = true;
      perfMark(`Slate first data paint (${games.length} games)`);
    }
  }, [games]);

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
      // Auto-close the calendar once a date is picked.
      setDatePickerOpen(false);
      // Picking a date implicitly satisfies the tutorial for first-time users,
      // but we no longer auto-close it mid-flow if they manually opened it.
      try {
        localStorage.setItem(ONBOARDING_KEY, "true");
      } catch {
        /* ignore */
      }
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
            <Popover
              open={datePickerOpen}
              onOpenChange={(open) => {
                setDatePickerOpen(open);
                if (open && overlayOpen) completeOnboarding();
              }}
            >
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
                  defaultMonth={selectedDate ?? new Date()}
                  onSelect={handleSelectDate}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content states */}
        {!selectedDate && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Select a game date to load matchups.
          </p>
        )}
        {selectedDate && (
          <>
            {/* True cold load only — refreshes reuse cached data below. */}
            {isColdLoad && (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Loading schedule…
              </p>
            )}

            {isError && !games && (
              <div className="py-16 text-center">
                <p className="text-sm text-destructive">
                  Unable to load the schedule.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {userMessageForError(error)}
                </p>
              </div>
            )}

            {!isColdLoad && !isError && games && games.length === 0 && (
              <p className="py-16 text-center text-sm text-muted-foreground">
                No games scheduled for this date.
              </p>
            )}

            {games && games.length > 0 && (
              <div className="space-y-6">
                <div className="flex items-baseline justify-between border-b border-border/50 pb-2">
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {format(selectedDate, "MMMM d, yyyy")}
                    {isBackgroundRefresh && (
                      <span className="normal-case tracking-normal text-[10px] font-normal text-muted-foreground/70">
                        Refreshing…
                      </span>
                    )}
                    {showStaleWarning && (
                      <span className="inline-flex items-center gap-1 normal-case tracking-normal text-[10px] font-normal text-amber-500/80">
                        Showing cached data — refresh failed
                      </span>
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {games.length} game{games.length !== 1 && "s"}
                  </span>
                </div>

                <div className="space-y-2">
                  {games.map((game) => (
                    <MatchupCard key={game.id} game={game} dateParam={dateParam} />
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
