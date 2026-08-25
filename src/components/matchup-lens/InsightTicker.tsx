import { useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { InsightStory } from "@/lib/matchup-lens-stories";
import { InfoTip } from "./InfoTip";

interface InsightTickerProps {
  stories: InsightStory[];
  onOpen: (story: InsightStory) => void;
}

const SWIPE_THRESHOLD = 40;

/**
 * One story at a time. Navigation is manual only — previous/next, dots, keyboard
 * arrows and touch swipe — so nothing moves under the user while they read.
 */
export function InsightTicker({ stories, onOpen }: InsightTickerProps) {
  const [index, setIndex] = useState(0);
  const dragStart = useRef<number | null>(null);

  useEffect(() => {
    if (index > stories.length - 1) setIndex(0);
  }, [index, stories.length]);

  if (stories.length === 0) return null;
  const story = stories[Math.min(index, stories.length - 1)];
  const step = (direction: -1 | 1) =>
    setIndex((value) => (value + direction + stories.length) % stories.length);

  return (
    <Card className="border-border bg-card" data-testid="insight-ticker">
      <CardContent
        className="p-3 sm:p-4"
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") step(-1);
          if (event.key === "ArrowRight") step(1);
        }}
        onTouchStart={(event) => {
          dragStart.current = event.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          const start = dragStart.current;
          dragStart.current = null;
          const end = event.changedTouches[0]?.clientX;
          if (start === null || end === undefined) return;
          if (end - start > SWIPE_THRESHOLD) step(-1);
          else if (start - end > SWIPE_THRESHOLD) step(1);
        }}
      >
        <div
          className="min-w-0"
          data-testid="ticker-story"
          data-story-id={story.id}
          aria-live="polite"
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

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            data-testid="ticker-cta"
            onClick={() => onOpen(story)}
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
                  onClick={() => setIndex(position)}
                  className={`h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    position === index ? "bg-primary" : "bg-border hover:bg-muted-foreground/60"
                  }`}
                />
              ))}
            </div>
            <button
              type="button"
              aria-label="Previous story"
              onClick={() => step(-1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Next story"
              onClick={() => step(1)}
              className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-8 sm:w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
