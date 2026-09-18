export function buildMatchupLensHref(gameId: string, awayAbbr: string, homeAbbr: string): string {
  const search = new URLSearchParams({
    a: awayAbbr,
    b: homeAbbr,
    view: "overview",
    game: gameId,
  });
  return `/matchup-lens?${search.toString()}`;
}