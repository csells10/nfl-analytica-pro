import { forwardRef, useState, useMemo, useEffect, useRef } from "react";
import { format, parse } from "date-fns";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
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
import StepGuide, { type StepGuideStep } from "@/components/StepGuide";
import { useGuide } from "@/lib/guides";
import { useScheduleScan } from "@/lib/use-schedule-scan";
import { perfMark } from "@/lib/perf";
import { buildMatchupLensHref, matchupLabActionLabel } from "@/lib/matchup-lens-link";

// Module-eval marker — fires when the lazy Slate chunk finishes parsing.
perfMark("Slate module evaluated");

const MATCHUPS_GUIDE_STEPS: StepGuideStep[] = [
  {
    title: "Choose a game date",
    body: "Pick a date to see the NFL games scheduled that day. GameLens opens on the next date with games.",
  },
  {
    title: "Choose a matchup",
    body: "Each row is one game. Away team first, home team second, with kickoff time and week.",
  },
  {
    title: "Open the game details",
    body: "Select a matchup to see its profile, core-area advantages and the overall lean.",
  },
  {
    title: "Open or review in Matchup Lab",
    body: "Matchup Lab compares both teams across six lenses, with the supporting evidence behind each read.",
  },
];

function parseDateParam(raw: string | null): Date | null {
  if (!raw) return null;
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return null;
  const parsed = new Date(y, m - 1, d);
  return isNaN(parsed.getTime()) ? null : parsed;
}

const MatchupCard = forwardRef<HTMLButtonElement, { game: NflGame; dateParam?: string; wasJustViewed?: boolean }>(
  function MatchupCard({ game, dateParam, wasJustViewed = false }, ref) {
    const navigate = useNavigate();

    return (
      <div
        className={cn(
          "group w-full rounded-lg border border-border bg-card transition-all duration-150 hover:border-primary/30 hover:bg-secondary/30",
          wasJustViewed && "animate-returned-game motion-reduce:animate-none",
        )}
        data-returned-game={wasJustViewed ? "true" : undefined}
      >
        <button
          ref={ref}
          className="w-full text-left"
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

        <div className="flex justify-end border-t border-border/60 px-5 py-2">
          <button
            type="button"
            data-testid="open-in-matchup-lens"
            onClick={() =>
              navigate(buildMatchupLensHref(game.id, game.awayTeam, game.homeTeam, dateParam))
            }
            className="rounded border border-border px-2 py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
          >
            {matchupLabActionLabel(game.status)}
          </button>
        </div>
      </div>
    );
  },
);
MatchupCard.displayName = "MatchupCard";

export default function Slate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const returningFromGame = (location.state as { returningFromGame?: string } | null)?.returningFromGame;

  // Resolve the initial date once on mount:
  //   1. `?date=YYYY-MM-DD` URL param (deep links / back-nav) wins and is
  //      never automatically replaced.
  //   2. Otherwise start on today; the seven-day scan may move the selection
  //      forward exactly once.
  const { initialDate, dateFromUrl } = useMemo(() => {
    const parsed = parseDateParam(searchParams.get("date"));
    if (parsed) return { initialDate: parsed, dateFromUrl: true };
    return { initialDate: new Date(), dateFromUrl: false };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [selectedDate, setSelectedDate] = useState<Date | undefined>(initialDate);
  const guide = useGuide("matchups");

  // Controls the date-picker popover so we can auto-close it on selection.
  const [datePickerOpen, setDatePickerOpen] = useState(false);

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

  // Seven-day lookup anchored on the mount date so it never re-scans in a loop.
  const scan = useScheduleScan(initialDate, true);
  const autoSelectedRef = useRef(false);

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
  const todayParam = format(initialDate, "yyyy-MM-dd");

  const selectDate = (date: Date | undefined) => {
    setSelectedDate(date);
    if (date) {
      setSearchParams({ date: format(date, "yyyy-MM-dd") }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  };

  const handleSelectDate = (date: Date | undefined) => {
    selectDate(date);
    if (date) setDatePickerOpen(false);
  };

  // One-time auto-selection of the earliest discovered date with games.
  useEffect(() => {
    if (dateFromUrl || autoSelectedRef.current || scan.isResolving) return;
    autoSelectedRef.current = true;
    const earliest = scan.datesWithGames[0];
    if (!earliest || earliest === todayParam) return;
    selectDate(parse(earliest, "yyyy-MM-dd", new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateFromUrl, scan.isResolving, scan.datesWithGames, todayParam]);

  const isFindingUpcoming = !dateFromUrl && !autoSelectedRef.current && scan.isResolving;

  const highlightedDates = useMemo(
    () => scan.datesWithGames.map((d) => parse(d, "yyyy-MM-dd", new Date())),
    [scan.datesWithGames],
  );

  // A different scanned date that does have games, offered when this one is empty.
  const suggestion = useMemo(() => {
    const next = scan.datesWithGames.find((d) => d !== dateParam);
    return next ? parse(next, "yyyy-MM-dd", new Date()) : null;
  }, [scan.datesWithGames, dateParam]);

  // Only claim the whole window is empty when all seven requests succeeded.
  const wholeWindowEmpty =
    scan.allSucceeded && !scan.hasFailures && scan.datesWithGames.length === 0;

  return (
    <AppShell>
      <StepGuide
        open={guide.open}
        eyebrow="Matchups"
        steps={MATCHUPS_GUIDE_STEPS}
        onDismiss={guide.dismiss}
        testId="matchups-guide"
      />

      <div className="mx-auto max-w-2xl animate-return-reveal py-8 motion-reduce:animate-none">
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
            <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
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
                  modifiers={{ hasGames: highlightedDates }}
                  modifiersClassNames={{
                    hasGames: "font-semibold text-primary underline underline-offset-4",
                  }}
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Content states */}
        {!selectedDate && (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Choose a date to see scheduled matchups.
          </p>
        )}
        {selectedDate && (
          <>
            {isFindingUpcoming && (
              <p className="py-20 text-center text-sm text-muted-foreground" data-testid="finding-upcoming">
                Finding upcoming games…
              </p>
            )}

            {/* True cold load only — refreshes reuse cached data below. */}
            {!isFindingUpcoming && isColdLoad && (
              <p className="py-20 text-center text-sm text-muted-foreground">
                Loading schedule…
              </p>
            )}

            {!isFindingUpcoming && isError && !games && (
              <div className="py-16 text-center">
                <p className="text-sm text-destructive">
                  Unable to load the schedule.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {userMessageForError(error)}
                </p>
              </div>
            )}

            {!isFindingUpcoming && !isColdLoad && !isError && games && games.length === 0 && (
              <div className="py-16 text-center" data-testid="slate-empty">
                <p className="text-sm text-muted-foreground">
                  {wholeWindowEmpty
                    ? "No games found in the next seven days. Choose another date."
                    : "No NFL games are scheduled for this date."}
                </p>
                {suggestion && (
                  <button
                    type="button"
                    data-testid="slate-suggestion"
                    onClick={() => selectDate(suggestion)}
                    className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10"
                  >
                    View games on {format(suggestion, "EEEE, MMMM d")}
                  </button>
                )}
              </div>
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
                    <MatchupCard
                      key={game.id}
                      game={game}
                      dateParam={dateParam}
                      wasJustViewed={game.id === returningFromGame}
                    />
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
