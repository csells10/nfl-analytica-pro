import { useEffect, useState } from "react";
import { Sparkles, X, ChevronDown, ChevronUp, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Section-level guidance for the Matchup page.
 *
 * Desktop: small branded contextual card placed inline above the section.
 * Mobile: compact "What is this?" row, collapsed by default. Never overlays
 * page content, never blocks scrolling.
 *
 * Dismissals persist per section under `hasSeenMatchupSectionGuide:<sectionKey>`.
 */

const STORAGE_PREFIX = "hasSeenMatchupSectionGuide:";
const RESET_EVENT = "gamelens:section-guides-reset";

export const SECTION_GUIDE_KEYS = [
  "game-profile",
  "core-area-advantage",
  "matchup-lean",
  "team-comparison",
  "model-trust",
] as const;

export type SectionGuideKey = (typeof SECTION_GUIDE_KEYS)[number];

export function clearAllSectionGuideDismissals() {
  try {
    SECTION_GUIDE_KEYS.forEach((k) => localStorage.removeItem(STORAGE_PREFIX + k));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new CustomEvent(RESET_EVENT));
}

interface SectionGuideProps {
  sectionKey: SectionGuideKey;
  title: string;
  body: string;
  enabled: boolean;
}

export function SectionGuide({ sectionKey, title, body, enabled }: SectionGuideProps) {
  const isMobile = useIsMobile();
  const [dismissed, setDismissed] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    try {
      setDismissed(localStorage.getItem(STORAGE_PREFIX + sectionKey) === "true");
    } catch {
      setDismissed(false);
    }
    const onReset = () => {
      setDismissed(false);
      setExpanded(false);
    };
    window.addEventListener(RESET_EVENT, onReset);
    return () => window.removeEventListener(RESET_EVENT, onReset);
  }, [sectionKey, enabled]);

  if (!enabled || dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_PREFIX + sectionKey, "true");
    } catch {
      /* ignore */
    }
    setDismissed(true);
  };

  if (isMobile) {
    return (
      <div
        className={cn(
          "mb-3 overflow-hidden rounded-md border border-border/60 bg-card/70",
          "animate-in fade-in-0 duration-200",
        )}
        role="region"
        aria-label={`About ${title}`}
      >
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="flex flex-1 items-center gap-1.5 px-2.5 py-2 text-left text-[11.5px] font-medium text-muted-foreground hover:text-foreground"
          >
            <Info className="h-3.5 w-3.5 text-primary/80" strokeWidth={2.25} />
            <span>What is this?</span>
            {expanded ? (
              <ChevronUp className="ml-auto h-3.5 w-3.5 opacity-70" />
            ) : (
              <ChevronDown className="ml-auto h-3.5 w-3.5 opacity-70" />
            )}
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label={`Dismiss ${title} guide`}
            className={cn(
              "mr-1 inline-flex h-9 w-9 flex-none items-center justify-center rounded-full",
              "text-muted-foreground/80 hover:bg-secondary hover:text-foreground",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            )}
          >
            <X className="h-4 w-4" strokeWidth={2.25} />
          </button>
        </div>
        {expanded && (
          <p className="border-t border-border/40 px-2.5 py-2 text-[11.5px] leading-snug text-muted-foreground">
            {body}
          </p>
        )}
      </div>
    );
  }

  // Desktop: compact branded contextual card, sits above the section.
  return (
    <div
      className={cn(
        "relative mb-3 flex items-start gap-3 rounded-lg border border-primary/20 bg-card/80",
        "px-3.5 py-2.5 pr-9 ring-1 ring-primary/5",
        "shadow-[0_4px_14px_-10px_hsl(var(--primary)/0.35)]",
        "animate-in fade-in-0 slide-in-from-top-1 duration-200",
      )}
      role="region"
      aria-label={`About ${title}`}
    >
      <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-md bg-primary/10 text-primary ring-1 ring-primary/20">
        <Sparkles className="h-3 w-3" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/80">
          About {title}
        </p>
        <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/85">{body}</p>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={`Dismiss ${title} guide`}
        className={cn(
          "absolute right-1.5 top-1.5 inline-flex h-6 w-6 items-center justify-center rounded-full",
          "text-muted-foreground/70 hover:bg-secondary hover:text-foreground",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        )}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.25} />
      </button>
    </div>
  );
}

export default SectionGuide;
