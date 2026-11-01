// Display-only matchup context derived from the game ID, plus the shared
// document-title hook. Nothing here feeds a request, identity decision or
// calculation — the backend response remains authoritative.

import { useEffect } from "react";
import { GAME_ID_PATTERN } from "./matchup-lens-live";
import { isValidFromDate } from "./matchup-lens-link";

export const DEFAULT_DOCUMENT_TITLE = "GameLens — NFL Matchup Intelligence";

export interface GameIdDisplayContext {
  awayAbbr: string;
  homeAbbr: string;
  /** Strict YYYY-MM-DD game date recovered from the ID. */
  date: string;
}

/**
 * Recover display context from a structurally valid game ID such as
 * `20260921_NYG@LAR`. Returns null when the ID shape, the embedded date, or
 * either team segment fails validation — callers must fall back to a neutral
 * display rather than invent teams.
 */
export function parseGameIdContext(gameId: string | null | undefined): GameIdDisplayContext | null {
  if (!gameId || !GAME_ID_PATTERN.test(gameId)) return null;
  const [datePart, teamsPart] = gameId.split("_");
  const [awayAbbr, homeAbbr] = (teamsPart ?? "").split("@");
  if (!awayAbbr || !homeAbbr) return null;
  const date = `${datePart.slice(0, 4)}-${datePart.slice(4, 6)}-${datePart.slice(6, 8)}`;
  if (!isValidFromDate(date)) return null;
  return { awayAbbr, homeAbbr, date };
}

/**
 * Format a strict YYYY-MM-DD date as "Nov 1, 2026" without timezone-related
 * day shifts: the date is parsed and rendered in UTC, never local time.
 */
export function formatGameDate(date: string | null | undefined): string | null {
  if (!isValidFromDate(date)) return null;
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Build the browser tab title for a matchup surface. */
export function matchupDocumentTitle(
  awayAbbr: string | null | undefined,
  homeAbbr: string | null | undefined,
  date: string | null | undefined,
  surface?: "lab",
): string | null {
  if (!awayAbbr || !homeAbbr) return null;
  const formatted = formatGameDate(date);
  if (!formatted) return null;
  const middle = surface === "lab" ? " · Lab · " : " · ";
  return `${awayAbbr} @ ${homeAbbr}${middle}${formatted} | GameLens`;
}

/**
 * Set the browser tab title while `title` is non-null, restoring the default
 * app title when the page unmounts or the title clears. Re-runs on title
 * change so navigating between games never leaves a stale title.
 */
export function useDocumentTitle(title: string | null): void {
  useEffect(() => {
    if (!title) return;
    document.title = title;
    return () => {
      document.title = DEFAULT_DOCUMENT_TITLE;
    };
  }, [title]);
}
