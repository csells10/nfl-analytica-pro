import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Sparkles, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Calendar-style spotlight tour that walks the user through a sequence of
 * page sections. Each step dims the rest of the page (NOT the active
 * section), draws a glowing ring around the active section, gently
 * scrolls to it, and shows a branded explanation card with `Next` /
 * `Finish`.
 *
 * - Backdrop is non-interactive (clicks do not advance or dismiss).
 * - Only the explicit `Next` / `Finish` button and the close `X` act on the tour.
 * - Steps with `available === false` are skipped.
 * - The dim layer is drawn as 4 rectangles around the spotlight, leaving
 *   the focused section fully visible (no darkening, no blur over it).
 */

export interface SpotlightTourStep {
  key: string;
  /** CSS selector for the section to spotlight, e.g. "[data-tour='game-profile']" */
  targetSelector: string;
  title: string;
  body: string;
  /** Optional icon for this step. Falls back to Sparkles. */
  icon?: LucideIcon;
  /** When false, the step is skipped entirely. Defaults to true. */
  available?: boolean;
}

interface Props {
  open: boolean;
  steps: SpotlightTourStep[];
  /** Called when the user closes via X (early exit). */
  onClose: () => void;
  /** Called when the user finishes the last step. */
  onComplete: () => void;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 10;
const DESKTOP_GAP = 24;
const DESKTOP_CARD_WIDTH = 360;
// Calmer pacing — gentle scroll + settle window before measuring.
const SETTLE_MS = 1100;
const SCROLL_DURATION_MS = 900;

/**
 * Custom slow smooth-scroll. Native `scrollIntoView({ behavior: "smooth" })`
 * is too fast in most browsers and can't be tuned. We animate window
 * scrollY ourselves so the tour feels deliberate, not snappy.
 */
function gentleScrollToCenter(el: HTMLElement, durationMs: number) {
  const rect = el.getBoundingClientRect();
  const targetY =
    window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2;
  const startY = window.scrollY;
  const delta = targetY - startY;
  if (Math.abs(delta) < 2) return;
  const start = performance.now();
  // easeInOutCubic — calm acceleration and deceleration
  const ease = (t: number) =>
    t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / durationMs);
    window.scrollTo(0, startY + delta * ease(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

export default function SectionSpotlightTour({ open, steps, onClose, onComplete }: Props) {
  const isMobile = useIsMobile();
  const visibleSteps = steps.filter((s) => s.available !== false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number | null>(null);

  // Reset to first step whenever the tour reopens.
  useEffect(() => {
    if (open) setActiveIndex(0);
  }, [open]);

  const activeStep = visibleSteps[activeIndex];
  const total = visibleSteps.length;
  const isLast = activeIndex >= total - 1;
  const StepIcon = activeStep?.icon ?? Sparkles;

  // Gently scroll the active section into view, then measure its rect.
  useLayoutEffect(() => {
    if (!open || !activeStep) return;
    let cancelled = false;
    setRect(null);

    const el = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
    if (!el) return;

    gentleScrollToCenter(el, SCROLL_DURATION_MS);

    const measure = () => {
      if (cancelled) return;
      const target = document.querySelector(activeStep.targetSelector) as HTMLElement | null;
      if (!target) return;
      const r = target.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    // Wait for the gentle scroll to settle, then measure. Re-measure on scroll/resize.
    const settleId = window.setTimeout(measure, SETTLE_MS);
    const onScrollOrResize = () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onScrollOrResize);
    window.addEventListener("scroll", onScrollOrResize, true);

    return () => {
      cancelled = true;
      window.clearTimeout(settleId);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("scroll", onScrollOrResize, true);
    };
  }, [open, activeStep?.targetSelector]);

  const advance = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setActiveIndex((i) => i + 1);
    }
  }, [isLast, onComplete]);

  // Keyboard: Esc closes, Enter advances.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, advance]);

  if (!open || !activeStep || total === 0) return null;

  const spotlight: Rect | null = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Desktop card placement: prefer below the section, flip above if not enough room.
  let desktopTop = 120;
  let desktopLeft = 24;
  if (!isMobile && spotlight) {
    const vh = window.innerHeight;
    const vw = window.innerWidth;
    const cardEstHeight = 220;
    const belowTop = spotlight.top + spotlight.height + DESKTOP_GAP;
    const aboveTop = spotlight.top - DESKTOP_GAP - cardEstHeight;
    desktopTop = belowTop + cardEstHeight + 16 < vh ? belowTop : Math.max(16, aboveTop);
    const centerX = spotlight.left + spotlight.width / 2;
    desktopLeft = Math.max(
      16,
      Math.min(centerX - DESKTOP_CARD_WIDTH / 2, vw - DESKTOP_CARD_WIDTH - 16),
    );
  }

  // Dim the page using 4 rectangles around the spotlight so the focus
  // area itself stays bright and readable. Calm, slower transitions.
  const dimClass =
    "pointer-events-none absolute bg-background/75 backdrop-blur-sm transition-all duration-700 ease-out";

  return (
    <div
      className="fixed inset-0 z-50 animate-in fade-in-0 duration-500"
      role="dialog"
      aria-modal="true"
      aria-labelledby="spotlight-tour-title"
    >
      {/* Dim layer — drawn as 4 rects around the spotlight so the focused
          section is NOT darkened or blurred. Falls back to a single full
          overlay until we've measured. */}
      {spotlight ? (
        <>
          {/* top */}
          <div
            className={dimClass}
            style={{ top: 0, left: 0, right: 0, height: Math.max(0, spotlight.top) }}
          />
          {/* bottom */}
          <div
            className={dimClass}
            style={{
              top: spotlight.top + spotlight.height,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />
          {/* left */}
          <div
            className={dimClass}
            style={{
              top: spotlight.top,
              left: 0,
              width: Math.max(0, spotlight.left),
              height: spotlight.height,
            }}
          />
          {/* right */}
          <div
            className={dimClass}
            style={{
              top: spotlight.top,
              left: spotlight.left + spotlight.width,
              right: 0,
              height: spotlight.height,
            }}
          />
        </>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-background/75 backdrop-blur-sm" />
      )}

      {/* Spotlight ring around the active section */}
      {spotlight && (
        <>
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-primary/70 transition-all duration-700 ease-out"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow: "0 0 28px hsl(var(--primary) / 0.35)",
            }}
          />
          <div
            className="pointer-events-none absolute rounded-xl animate-pulse transition-all duration-700 ease-out"
            style={{
              top: spotlight.top - 4,
              left: spotlight.left - 4,
              width: spotlight.width + 8,
              height: spotlight.height + 8,
              boxShadow: "0 0 40px 4px hsl(var(--primary) / 0.25)",
            }}
          />
        </>
      )}

      {/* Explanation card */}
      <div
        className={cn(
          "absolute rounded-2xl border border-border/60 bg-card",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
          "ring-1 ring-primary/10",
          "animate-in fade-in-0 zoom-in-95 duration-500",
          "transition-all ease-out",
          isMobile
            ? "inset-x-3 bottom-3 max-h-[44vh] overflow-y-auto"
            : "w-[360px]",
        )}
        style={
          isMobile
            ? undefined
            : { top: desktopTop, left: desktopLeft, width: DESKTOP_CARD_WIDTH }
        }
      >
        <div className="p-5 pr-12">
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
              <StepIcon className="h-3.5 w-3.5" />
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              GameLens · Guided tour
            </span>
            <span className="ml-auto text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/70">
              Step {activeIndex + 1} of {total}
            </span>
          </div>

          <h2
            id="spotlight-tour-title"
            className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
          >
            {activeStep.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {activeStep.body}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            {/* Step dots */}
            <div className="flex items-center gap-1.5" aria-hidden="true">
              {visibleSteps.map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "h-1.5 rounded-full transition-all duration-500",
                    i === activeIndex
                      ? "w-5 bg-primary"
                      : "w-1.5 bg-muted-foreground/30",
                  )}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={advance}
              className={cn(
                "inline-flex items-center justify-center rounded-md",
                "bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground",
                "shadow-[0_8px_20px_-8px_hsl(var(--primary)/0.5)]",
                "hover:bg-primary/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                "transition-colors",
              )}
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>

        {/* Close X — large tap target, always reachable */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close tour"
          className={cn(
            "absolute right-2 top-2 inline-flex items-center justify-center rounded-full",
            "bg-secondary/70 text-foreground/80 hover:bg-secondary hover:text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "transition-colors",
            "h-10 w-10",
          )}
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>
      </div>
    </div>
  );
}
