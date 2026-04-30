import { useEffect, useState } from "react";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "hasSeenMatchupIntro";

/**
 * Lightweight first-entry orientation popup for the Matchup detail page.
 *
 * - Appears once per user (persisted via localStorage).
 * - Non-blocking: rendered as a floating card, not a full-screen modal.
 * - Prominent top-right X for easy dismissal on mobile.
 */
export function MatchupIntroDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "true") {
        setOpen(true);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "true");
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 sm:bottom-6"
      role="dialog"
      aria-modal="false"
      aria-labelledby="matchup-intro-title"
    >
      <div
        className={cn(
          "pointer-events-auto relative w-full max-w-md",
          "rounded-2xl border border-border/60 bg-card p-5 pr-12",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-300",
        )}
      >
        {/* Clear, large-target close button (top-right). */}
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className={cn(
            "absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center",
            "rounded-full bg-secondary text-foreground/80",
            "hover:bg-secondary/80 hover:text-foreground",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          )}
        >
          <X className="h-5 w-5" strokeWidth={2.25} />
        </button>

        <div className="mb-3 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            GameLens · Quick read
          </span>
        </div>

        <h2
          id="matchup-intro-title"
          className="text-base font-semibold tracking-tight text-foreground"
        >
          Before you dive in
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          This page compares both teams across matchup signals, core areas, and
          model lean — so you can understand why the game profile points one
          way or stays cautious.
        </p>
      </div>
    </div>
  );
}

export default MatchupIntroDialog;
