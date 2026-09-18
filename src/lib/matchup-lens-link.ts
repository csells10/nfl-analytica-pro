/**
 * Strict `YYYY-MM-DD` validation used for the `fromDate` navigation context.
 * Navigation context only — never part of a request, identity or calculation.
 */
export function isValidFromDate(raw: string | null | undefined): raw is string {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  const [y, m, d] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d
  );
}

export function buildMatchupLensHref(
  gameId: string,
  awayAbbr: string,
  homeAbbr: string,
  fromDate?: string | null,
): string {
  const search = new URLSearchParams({
    a: awayAbbr,
    b: homeAbbr,
    view: "overview",
    game: gameId,
  });
  if (isValidFromDate(fromDate)) search.set("fromDate", fromDate);
  return `/matchup-lens?${search.toString()}`;
}

/** Matchups destination that restores a known date when one is valid. */
export function matchupsHref(fromDate?: string | null): string {
  return isValidFromDate(fromDate) ? `/?date=${fromDate}` : "/";
}

/** Shared normalization for the final statuses returned by game data. */
export function isFinalGameStatus(status?: string): boolean {
  return Boolean(status && /final/i.test(status));
}

export function matchupLabActionLabel(status?: string): string {
  return isFinalGameStatus(status) ? "Review in Matchup Lab" : "Open in Matchup Lab";
}
