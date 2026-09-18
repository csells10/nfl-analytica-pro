export function buildMatchupLensHref(gameId: string, awayAbbr: string, homeAbbr: string): string {
  const search = new URLSearchParams({
    a: awayAbbr,
    b: homeAbbr,
    view: "overview",
    game: gameId,
  });
  return `/matchup-lens?${search.toString()}`;
}

/** Shared normalization for the final statuses returned by game data. */
export function isFinalGameStatus(status?: string): boolean {
  return Boolean(status && /final/i.test(status));
}

export function matchupLabActionLabel(status?: string): string {
  return isFinalGameStatus(status) ? "Review in Matchup Lab" : "Open in Matchup Lab";
}