import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InsightStory } from "@/lib/matchup-lens-stories";
import { InfoTip } from "./InfoTip";

interface InsightTickerProps {
  stories: InsightStory[];
  onOpen: (story: InsightStory) => void;
}

const SWIPE_THRESHOLD = 40;
/** Calm cadence: one automatic change every eight seconds. */
export const TICKER_INTERVAL_MS = 8000;
const TICK_MS = 200;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * One story at a time. Auto-advance is calm and explicitly controllable: it
 * pauses on hover/focus, after any manual action, while the tab is hidden, and
 * never starts at all under prefers-reduced-motion.
 */
export function InsightTicker({ stories, onOpen }: InsightTickerProps) {
  const [index, setIndex] = useState(0);
  const [reduced] = useState(prefersReducedMotion);
  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [suspended, setSuspended] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [manualLabel, setManualLabel] = useState("");
  const [entering, setEntering] = useState(false);
  const dragStart = useRef<number | null>(null);
  const playRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (index > stories.length - 1) setIndex(0);
  }, [index, stories.length]);

  const advance = useCallback(
    (direction: -1 | 1) => {
      setIndex((value) => (value + direction + stories.length) % stories.length);
      setElapsed(0);
      if (!reduced) {
        setEntering(true);
        window.setTimeout(() => setEntering(false), 220);
      }
    },
    [reduced, stories.length],
  );

  /** Manual navigation always stops the carousel until the user plays again. */
  const manualStep = useCallback(
    (direction: -1 | 1) => {
      setPlaying(false);
      advance(direction);
      setManualLabel(`Story ${((index + direction + stories.length) % stories.length) + 1} of ${stories.length}`);
    },
    [advance, index, stories.length],
  );

  const goTo = useCallback(
    (position: number) => {
      setPlaying(false);
      setIndex(position);
      setElapsed(0);
      setManualLabel(`Story ${position + 1} of ${stories.length}`);
    },
    [stories.length],
  );

  // Pause while the document is hidden.
  useEffect(() => {
    const onVisibility = () => setSuspended(document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const active = playing && !suspended && !reduced && stories.length > 1;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      setElapsed((value) => {
        const next = value + TICK_MS;
        if (next >= TICKER_INTERVAL_MS) {
          advance(1);
          return 0;
        }
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active, advance]);

  if (stories.length === 0) return null;
  const story = stories[Math.min(index, stories.length - 1)];
  const progress = active ? Math.min(100, (elapsed / TICKER_INTERVAL_MS) * 100) : 0;

  return (
    <Card
      className="border-border bg-card"
      data-testid="insight-ticker"
      data-playing={active ? "true" : "false"}
      data-reduced-motion={reduced ? "true" : "false"}
      onMouseEnter={() => setSuspended(true)}
      onMouseLeave={() => setSuspended(false)}
      onFocusCapture={(event) => {
        // Reading focus suspends automatic changes, but an explicit Play must
        // genuinely resume without the user having to click elsewhere first.
        if (event.target === playRef.current) return;
        setSuspended(true);
      }}
      onBlurCapture={() => setSuspended(false)}
    >
      <CardContent
        className="p-3 sm:p-4"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") manualStep(-1);
          if (event.key === "ArrowRight") manualStep(1);
        }}
        onTouchStart={(event) => {
          dragStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = dragStart.current;
          dragStart.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;
          if (end - start > SWIPE_THRESHOLD) manualStep(-1);
          else if (start - end > SWIPE_THRESHOLD) manualStep(1);
        }}
      >
        <div
          className={`min-w-0 ${
            reduced
              ? ""
              : `transition-[opacity,transform] duration-200 ease-out ${
                  entering ? "translate-y-1 opacity-0" : "translate-y-0 opacity-100"
                }`
          }`}
          data-testid="ticker-story"
          data-story-id={story.id}
        >
          <div className="flex items-center gap-1.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-accent-warm">
              {story.category}
            </p>
            {story.why && (
              <InfoTip label={story.category} triggerLabel="Why this appears">
                {story.why}
              </InfoTip>
            )}
          </div>
          <p className="mt-1 text-sm font-semibold leading-snug text-foreground">
            {story.sentence}
          </p>
          <p className="mt-1 font-mono text-[11px] leading-snug text-muted-foreground">
            {story.support}
          </p>
          {story.note && (
            <p className="mt-1 text-[10px] italic text-muted-foreground">{story.note}</p>
          )}
        </div>

        {/* Automatic changes are never announced; manual ones update a polite status. */}
        <p className="sr-only" role="status" aria-live="polite" data-testid="ticker-status">
          {manualLabel}
        </p>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-testid="ticker-cta"
            onClick={() => {
              setPlaying(false);
              onOpen(story);
            }}
            className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[36px]"
          >
            {story.ctaLabel}
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>

          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[11px] text-muted-foreground" data-testid="ticker-count">
              {Math.min(index, stories.length - 1) + 1} of {stories.length}
            </span>
            <div className="flex items-center gap-1" role="tablist" aria-label="Matchup stories">
              {stories.map((entry, position) => (
                <button
                  key={entry.id}
                  type="button"
                  role="tab"
                  aria-selected={position === index}
                  aria-label={entry.category}
                  data-story-dot={entry.id}
                  onClick={() => goTo(position)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    position === index ? "bg-primary" : "bg-border hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              ref={playRef}
              data-testid="ticker-playpause"
              aria-label={playing ? "Pause automatic stories" : "Play automatic stories"}
              aria-pressed={playing}
              disabled={reduced || stories.length < 2}
              onClick={() => {
                setPlaying((value) => {
                  const next = !value;
                  if (next) setSuspended(document.hidden);
                  return next;
                });
                setElapsed(0);
              }}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40 sm:h-8 sm:w-8"
            >
              {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => manualStep(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => manualStep(1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Quiet progress so the next automatic change is expected. */}
        <div
          className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-border/60"
          data-testid="ticker-progress"
          data-progress={Math.round(progress)}
          data-active={active ? "true" : "false"}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full bg-primary/60 transition-[width] duration-200 ease-linear"
            style={{ width: `${progress}%` }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
