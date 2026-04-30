import { useEffect, useState } from "react";
import { Sparkles, X, ChevronDown, ChevronUp, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { clearAllSectionGuideDismissals } from "@/components/SectionGuide";

/**
 * First-entry helper popup for the Matchup detail page.
 *
 * Three selectable variants for QA preview. Switch via:
 *   localStorage.setItem("matchupIntroVariant", "compact-coach-mark" | "step-mini-guide" | "inline-welcome-banner")
 *   then reload. Or append ?introVariant=<name> to the URL.
 *
 * Each variant has a distinct desktop and mobile treatment, and a clear X.
 * Dismissal is per-variant so options can be independently QA'd.
 */

export type MatchupIntroVariant =
  | "compact-coach-mark"
  | "step-mini-guide"
  | "inline-welcome-banner"
  | "section-guided-onboarding";

export const MATCHUP_INTRO_VARIANTS: ReadonlyArray<{
  id: MatchupIntroVariant;
  label: string;
}> = [
  { id: "compact-coach-mark", label: "Compact Coach Mark" },
  { id: "step-mini-guide", label: "Step Mini Guide" },
  { id: "inline-welcome-banner", label: "Inline Welcome Banner" },
  { id: "section-guided-onboarding", label: "Section Guided" },
];

const DEFAULT_VARIANT: MatchupIntroVariant = "compact-coach-mark";
const VARIANT_STORAGE_KEY = "matchupIntroVariant";
const INTRO_REOPEN_EVENT = "gamelens:matchup-intro-reopen";

function isVariant(v: string | null): v is MatchupIntroVariant {
  return (
    v === "compact-coach-mark" ||
    v === "step-mini-guide" ||
    v === "inline-welcome-banner" ||
    v === "section-guided-onboarding"
  );
}

export function isSectionGuidedVariant(): boolean {
  return resolveVariant() === "section-guided-onboarding";
}

function resolveVariant(): MatchupIntroVariant {
  try {
    const fromQuery = new URL(window.location.href).searchParams.get("introVariant");
    if (isVariant(fromQuery)) return fromQuery;
    const fromStorage = localStorage.getItem(VARIANT_STORAGE_KEY);
    if (isVariant(fromStorage)) return fromStorage;
  } catch {
    /* ignore */
  }
  return DEFAULT_VARIANT;
}

function storageKeyFor(variant: MatchupIntroVariant) {
  return `hasSeenMatchupIntro:${variant}`;
}

/** QA helper: switch active variant and force-reopen the intro immediately. */
export function setMatchupIntroVariant(variant: MatchupIntroVariant) {
  try {
    localStorage.setItem(VARIANT_STORAGE_KEY, variant);
    localStorage.removeItem(storageKeyFor(variant));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<MatchupIntroVariant>(INTRO_REOPEN_EVENT, { detail: variant }),
  );
}

/** QA helper: clear all dismissals and reopen the current variant. */
export function resetMatchupIntro() {
  const current = resolveVariant();
  try {
    MATCHUP_INTRO_VARIANTS.forEach((v) => localStorage.removeItem(storageKeyFor(v.id)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(
    new CustomEvent<MatchupIntroVariant>(INTRO_REOPEN_EVENT, { detail: current }),
  );
}

export function getMatchupIntroVariant(): MatchupIntroVariant {
  return resolveVariant();
}

export function MatchupIntroDialog() {
  const isMobile = useIsMobile();
  const [variant, setVariant] = useState<MatchupIntroVariant | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const v = resolveVariant();
    setVariant(v);
    try {
      if (localStorage.getItem(storageKeyFor(v)) !== "true") {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }

    const onReopen = (e: Event) => {
      const next = (e as CustomEvent<MatchupIntroVariant>).detail ?? resolveVariant();
      setVariant(next);
      setOpen(true);
    };
    window.addEventListener(INTRO_REOPEN_EVENT, onReopen);
    return () => window.removeEventListener(INTRO_REOPEN_EVENT, onReopen);
  }, []);

  const dismiss = () => {
    if (variant) {
      try {
        localStorage.setItem(storageKeyFor(variant), "true");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  };

  if (!open || !variant) return null;

  if (variant === "compact-coach-mark") {
    return <CompactCoachMark isMobile={isMobile} onDismiss={dismiss} />;
  }
  if (variant === "step-mini-guide") {
    return <StepMiniGuide isMobile={isMobile} onDismiss={dismiss} />;
  }
  return <InlineWelcomeBanner isMobile={isMobile} onDismiss={dismiss} />;
}

// ─────────────────────────────────────────────────────────────
// Shared close button
// ─────────────────────────────────────────────────────────────

function CloseButton({
  onClick,
  size = "md",
  className,
}: {
  onClick: () => void;
  size?: "sm" | "md";
  className?: string;
}) {
  const dims = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Dismiss"
      className={cn(
        "inline-flex items-center justify-center rounded-full",
        "bg-secondary/70 text-foreground/80 hover:bg-secondary hover:text-foreground",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        "transition-colors",
        dims,
        className,
      )}
    >
      <X className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} strokeWidth={2.25} />
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 1: Compact Coach Mark
// ─────────────────────────────────────────────────────────────

function CompactCoachMark({
  isMobile,
  onDismiss,
}: {
  isMobile: boolean;
  onDismiss: () => void;
}) {
  if (isMobile) {
    return (
      <div
        className="pointer-events-none fixed inset-x-0 bottom-3 z-50 flex justify-center px-3"
        role="dialog"
        aria-modal="false"
        aria-labelledby="coach-mark-title"
      >
        <div
          className={cn(
            "pointer-events-auto relative w-full max-w-sm",
            "rounded-xl border border-border/60 bg-card/95 backdrop-blur-sm p-3.5 pr-10",
            "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.25)]",
            "animate-in fade-in-0 slide-in-from-bottom-2 duration-300",
          )}
        >
          <CloseButton size="sm" onClick={onDismiss} className="absolute right-1.5 top-1.5" />
          <div className="mb-1 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Quick read
            </span>
          </div>
          <h2 id="coach-mark-title" className="text-sm font-semibold text-foreground">
            How to read this matchup
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Game Profile → Core Areas → Matchup Lean → Confidence. Model Trust
            for postgame review.
          </p>
        </div>
      </div>
    );
  }

  // Desktop: small floating card top-right of main content
  return (
    <div
      className="pointer-events-none fixed right-6 top-20 z-40 max-w-xs"
      role="dialog"
      aria-modal="false"
      aria-labelledby="coach-mark-title"
    >
      <div
        className={cn(
          "pointer-events-auto relative",
          "rounded-xl border border-primary/25 bg-card p-4 pr-10",
          "shadow-[0_18px_50px_-15px_hsl(var(--primary)/0.35)]",
          "ring-1 ring-primary/10",
          "animate-in fade-in-0 slide-in-from-top-2 duration-300",
        )}
      >
        <CloseButton size="sm" onClick={onDismiss} className="absolute right-2 top-2" />
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
            <Sparkles className="h-3 w-3" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            GameLens · Quick read
          </span>
        </div>
        <h2 id="coach-mark-title" className="text-sm font-semibold text-foreground">
          How to read this matchup
        </h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
          Start with Game Profile, then check Core Area Advantage, Matchup Lean,
          and Confidence. Model Trust helps review the result after the game.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 2: Step-by-Step Mini Guide
// ─────────────────────────────────────────────────────────────

const STEPS: Array<{ short: string; full: string }> = [
  { short: "Game Profile = main signals", full: "Game Profile shows pressure, turnover risk, and scoring." },
  { short: "Core Areas = broader strengths", full: "Core Area Advantage compares broader team strengths." },
  { short: "Matchup Lean = final read", full: "Matchup Lean is the backend's final directional read." },
  { short: "Confidence = guardrail", full: "Confidence flags how close or noisy the matchup is." },
  { short: "Model Trust = postgame review", full: "Model Trust reviews the result after the game." },
];

function StepMiniGuide({
  isMobile,
  onDismiss,
}: {
  isMobile: boolean;
  onDismiss: () => void;
}) {
  if (isMobile) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center px-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mini-guide-title"
      >
        <div
          className="absolute inset-0 bg-background/70 backdrop-blur-sm"
          onClick={onDismiss}
        />
        <div
          className={cn(
            "relative flex w-full max-w-sm flex-col",
            "max-h-[70vh]",
            "rounded-2xl border border-border/60 bg-card",
            "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.55)]",
            "animate-in fade-in-0 zoom-in-95 duration-300",
          )}
        >
          <div className="flex items-start justify-between gap-3 border-b border-border/50 p-4">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Reading order
              </span>
              <h2 id="mini-guide-title" className="mt-0.5 text-base font-semibold text-foreground">
                How to read this matchup
              </h2>
            </div>
            <CloseButton onClick={onDismiss} size="sm" />
          </div>
          <ol className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {STEPS.map((s, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary ring-1 ring-primary/25">
                  {i + 1}
                </span>
                <span className="text-sm leading-snug text-foreground/90">{s.short}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    );
  }

  // Desktop: slightly top-centered medium modal
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center px-6 pt-24"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mini-guide-title"
    >
      <div className="absolute inset-0 bg-background/60 backdrop-blur-sm" onClick={onDismiss} />
      <div
        className={cn(
          "relative w-full max-w-md",
          "rounded-2xl border border-border/60 bg-card p-6",
          "shadow-[0_25px_70px_-20px_hsl(var(--primary)/0.35)]",
          "ring-1 ring-primary/10",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-300",
        )}
      >
        <CloseButton onClick={onDismiss} className="absolute right-3 top-3" />
        <div className="mb-1 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
            <BookOpen className="h-3.5 w-3.5" />
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            GameLens · Reading order
          </span>
        </div>
        <h2 id="mini-guide-title" className="pr-8 text-lg font-semibold tracking-tight text-foreground">
          How to read this matchup
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          A quick trail map for the page. Take it in this order.
        </p>
        <ol className="mt-4 space-y-3">
          {STEPS.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 flex-none items-center justify-center rounded-full bg-primary/15 text-xs font-bold text-primary ring-1 ring-primary/25">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-medium text-foreground">{s.short}</p>
                <p className="text-xs text-muted-foreground">{s.full}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Option 3: Inline Welcome Banner / Expandable Guide
// ─────────────────────────────────────────────────────────────

function InlineWelcomeBanner({
  isMobile,
  onDismiss,
}: {
  isMobile: boolean;
  onDismiss: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className={cn(
        "relative mb-4 overflow-hidden rounded-xl border border-primary/25",
        "bg-gradient-to-r from-primary/10 via-card to-card",
        "shadow-[0_8px_24px_-12px_hsl(var(--primary)/0.25)]",
        "animate-in fade-in-0 slide-in-from-top-1 duration-300",
      )}
      role="region"
      aria-labelledby="inline-banner-title"
    >
      <div className={cn("flex items-start gap-3 p-3.5 pr-12", isMobile ? "" : "p-4 pr-14")}>
        <span className="mt-0.5 inline-flex h-7 w-7 flex-none items-center justify-center rounded-md bg-primary/15 text-primary ring-1 ring-primary/25">
          <Sparkles className="h-3.5 w-3.5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h2
              id="inline-banner-title"
              className={cn("font-semibold text-foreground", isMobile ? "text-sm" : "text-[15px]")}
            >
              New to this page?
            </h2>
          </div>
          <p
            className={cn(
              "mt-0.5 leading-relaxed text-muted-foreground",
              isMobile ? "text-xs" : "text-sm",
            )}
          >
            Use Game Profile for the main signals, Core Areas for team
            strengths, and Matchup Lean for the backend's directional read.
          </p>
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80"
            aria-expanded={expanded}
          >
            {expanded ? "Hide reading order" : "How to read this"}
            {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
          {expanded && (
            <ol className="mt-3 grid gap-1.5 border-t border-border/40 pt-3 sm:grid-cols-2">
              {STEPS.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-foreground/85">
                  <span className="mt-0.5 inline-flex h-4 w-4 flex-none items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {i + 1}
                  </span>
                  <span>{s.short}</span>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
      <CloseButton size="sm" onClick={onDismiss} className="absolute right-2 top-2" />
    </div>
  );
}

export default MatchupIntroDialog;
