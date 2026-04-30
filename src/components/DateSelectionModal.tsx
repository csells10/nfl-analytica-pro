import { useEffect, useLayoutEffect, useState } from "react";
import { Sparkles, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface DateSelectionModalProps {
  open: boolean;
  onDismiss: () => void;
  /** CSS selector for the existing calendar trigger on the page */
  targetSelector: string;
}

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function DateSelectionModal({
  open,
  onDismiss,
  targetSelector,
}: DateSelectionModalProps) {
  const [rect, setRect] = useState<Rect | null>(null);


  // Track the position of the target calendar element.
  useLayoutEffect(() => {
    if (!open) return;

    const measure = () => {
      const el = document.querySelector(targetSelector) as HTMLElement | null;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
    };

    measure();
    const id = window.setTimeout(measure, 50); // after layout settles

    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, targetSelector]);

  // Lock background scroll while overlay is open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const PAD = 10;
  const GAP = 50; // comfortable separation between spotlight and modal
  const MODAL_WIDTH = 352; // ~22rem
  const spotlight = rect
    ? {
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }
    : null;

  // Modal positioned with comfortable gap below the spotlight.
  const modalTop = spotlight ? spotlight.top + spotlight.height + GAP : 120;
  const spotlightCenterX = spotlight ? spotlight.left + spotlight.width / 2 : 0;
  // Center modal under the spotlight, clamped to viewport.
  const rawModalLeft = spotlightCenterX - MODAL_WIDTH / 2;
  const modalLeft = spotlight
    ? Math.max(16, Math.min(rawModalLeft, window.innerWidth - MODAL_WIDTH - 16))
    : 40;
  // Arrow X position relative to modal — tip should align to spotlight center.
  const arrowLeft = spotlight
    ? Math.max(20, Math.min(spotlightCenterX - modalLeft, MODAL_WIDTH - 36))
    : 32;

  return (
    <div
      className="fixed inset-0 z-50 animate-in fade-in-0 duration-200"
      aria-modal="true"
      role="dialog"
    >
      {/* Dimmed + blurred backdrop with a spotlight cutout */}
      <div className="absolute inset-0 bg-background/75 backdrop-blur-sm" />

      {spotlight && (
        <>
          {/* Spotlight ring around the existing calendar */}
          <div
            className="pointer-events-none absolute rounded-xl ring-2 ring-primary/70 transition-all duration-300"
            style={{
              top: spotlight.top,
              left: spotlight.left,
              width: spotlight.width,
              height: spotlight.height,
              boxShadow:
                "0 0 0 9999px hsl(var(--background) / 0.72), 0 0 28px hsl(var(--primary) / 0.35)",
            }}
          />
          {/* Soft pulsing glow */}
          <div
            className="pointer-events-none absolute rounded-xl animate-pulse"
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

      {/* Onboarding card */}
      <div
        className={cn(
          "absolute w-[min(22rem,calc(100vw-2rem))]",
          "rounded-2xl border border-border/60 bg-card p-6",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-300"
        )}
        style={{
          top: modalTop,
          left: modalLeft,
        }}
      >
        {/* Arrow pointing up to the calendar — anchored to spotlight center */}
        <div
          className="absolute -top-2 h-4 w-4 rotate-45 border-l border-t border-border/60 bg-card"
          style={{ left: arrowLeft - 8 }}
        />
        <div
          className="absolute text-primary/80 animate-bounce"
          style={{ left: arrowLeft - 10, top: -36 }}
        >
          <ArrowUp className="h-5 w-5" strokeWidth={2.5} />
        </div>

        <div className="mb-4 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            GameLens · Matchup Intelligence
          </span>
        </div>

        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Select a Game Date
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Choose a date to begin exploring matchup insights.
        </p>

        <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-primary/30 bg-primary/5 px-3 py-2">
          <ArrowUp className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs text-foreground/80">
            Click the highlighted <span className="font-medium">Game date</span> field above
          </span>
        </div>

      </div>
    </div>
  );
}
