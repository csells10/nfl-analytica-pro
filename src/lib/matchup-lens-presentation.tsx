// Presentation-only guards for live Matchup Lens evidence.
//
// League standing is suppressed when the payload carries only the two matchup
// teams. Suppression is a display decision: the ranking helpers in
// `matchup-lens-rank.ts` are untouched, their output is simply not rendered.

import { createContext, useContext, type ReactNode } from "react";
import type { LeagueStanding } from "./matchup-lens-rank";
import { rankText } from "./matchup-lens-language";

export interface LensPresentation {
  /** True when league context is suppressed by the backend payload. */
  suppressLeagueContext: boolean;
}

const DEFAULT_PRESENTATION: LensPresentation = { suppressLeagueContext: false };

const LensPresentationContext = createContext<LensPresentation>(DEFAULT_PRESENTATION);

export function LensPresentationProvider({
  value,
  children,
}: {
  value: LensPresentation;
  children: ReactNode;
}) {
  return (
    <LensPresentationContext.Provider value={value}>{children}</LensPresentationContext.Provider>
  );
}

export function useLensPresentation(): LensPresentation {
  return useContext(LensPresentationContext);
}

/**
 * Rank text for display, or null when league context is suppressed. Callers
 * must omit the whole rank element when this returns null — there is no
 * "1st of 2" placeholder.
 */
export function useRankText(): (standing: LeagueStanding) => string | null {
  const { suppressLeagueContext } = useLensPresentation();
  return (standing: LeagueStanding) =>
    suppressLeagueContext ? null : rankText(standing.rank, standing.total);
}

export const LEAGUE_CONTEXT_SUPPRESSED_NOTE =
  "League rankings are hidden: this view carries evidence for these two teams only.";
