import { useState, useEffect } from "react";
import { RotateCcw, FlaskConical } from "lucide-react";
import {
  MATCHUP_INTRO_VARIANTS,
  setMatchupIntroVariant,
  resetMatchupIntro,
  getMatchupIntroVariant,
  type MatchupIntroVariant,
} from "@/components/MatchupIntroDialog";
import { cn } from "@/lib/utils";

/**
 * Temporary QA-only control to switch between Matchup Intro variants.
 * Visible only in development / Lovable preview, not in production builds.
 */
export function MatchupIntroQASelector() {
  const [active, setActive] = useState<MatchupIntroVariant>("compact-coach-mark");

  useEffect(() => {
    setActive(getMatchupIntroVariant());
  }, []);

  // Only render outside production builds.
  if (import.meta.env.PROD) return null;

  const handleSelect = (variant: MatchupIntroVariant) => {
    setActive(variant);
    setMatchupIntroVariant(variant);
  };

  return (
    <div
      className={cn(
        "mb-3 flex flex-wrap items-center gap-2 rounded-md border border-dashed border-border/70",
        "bg-muted/30 px-2.5 py-1.5 text-xs",
      )}
      role="region"
      aria-label="Matchup intro QA selector"
    >
      <span className="inline-flex items-center gap-1 font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        <FlaskConical className="h-3 w-3" />
        Intro QA
      </span>

      {/* Segmented control on sm+, dropdown on mobile */}
      <div className="hidden sm:inline-flex overflow-hidden rounded border border-border/70">
        {MATCHUP_INTRO_VARIANTS.map((v) => (
          <button
            key={v.id}
            type="button"
            onClick={() => handleSelect(v.id)}
            className={cn(
              "px-2.5 py-1 text-[11px] font-medium transition-colors",
              "border-r border-border/70 last:border-r-0",
              active === v.id
                ? "bg-primary/15 text-primary"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
            )}
          >
            {v.label}
          </button>
        ))}
      </div>

      <select
        value={active}
        onChange={(e) => handleSelect(e.target.value as MatchupIntroVariant)}
        className={cn(
          "sm:hidden rounded border border-border/70 bg-background px-2 py-1 text-[11px]",
          "text-foreground focus:outline-none focus:ring-1 focus:ring-primary",
        )}
        aria-label="Select intro variant"
      >
        {MATCHUP_INTRO_VARIANTS.map((v) => (
          <option key={v.id} value={v.id}>
            {v.label}
          </option>
        ))}
      </select>

      <button
        type="button"
        onClick={() => {
          resetMatchupIntro();
          setActive(getMatchupIntroVariant());
        }}
        className={cn(
          "ml-auto inline-flex items-center gap-1 rounded border border-border/70 px-2 py-1",
          "text-[11px] text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
        title="Clear dismissals and reopen current variant"
      >
        <RotateCcw className="h-3 w-3" />
        Reset
      </button>
    </div>
  );
}

export default MatchupIntroQASelector;
