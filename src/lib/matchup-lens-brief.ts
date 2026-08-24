// Game Brief: deterministic statements assembled from values the scoring engine
// already produced. No prediction, no win probability, no invented meaning.
//
// The dashboard already carries "largest separation" and "closest lens" as
// headline cards, so the brief deliberately does not repeat them.

import type { LensSnapshot, TeamMetricRow } from "./matchup-lens-types";
import { LENSES, scoreAllLenses } from "./matchup-lens";
import { comparisonHighlights, lensGaps, type LensGap } from "./matchup-lens-compare";
import { collisionDirections, collisionHighlights } from "./matchup-lens-collision";
import { lensStanding } from "./matchup-lens-rank";
import { momentumReadiness } from "./matchup-lens-momentum";
import { ordinal } from "./matchup-lens-language";

export interface BriefObservation {
  id: string;
  /** Plain language first. */
  text: string;
  /** Exact Lens Score / rank context, shown beneath the sentence. */
  detail: string;
  /** Lens this observation opens. */
  lensKey?: string;
  /** Collision lane this observation opens. */
  collisionKey?: string;
}

export interface GameBrief {
  largest: LensGap | null;
  closest: LensGap | null;
  observations: BriefObservation[];
  /** One-line data status for the top of the brief. */
  statusLine: string;
  caveats: string[];
  contextLabel: string;
  gamesLabel: string;
}

/** Best-ranked lens for one team, ignoring lenses without a score. */
function bestLens(snapshot: LensSnapshot, team: TeamMetricRow) {
  const ranked = LENSES.map((lens) => ({
    key: lens.key,
    name: lens.name,
    standing: lensStanding(snapshot, lens.key, team.teamAbv),
  })).filter((entry) => entry.standing.rank !== null);
  if (ranked.length === 0) return null;
  return ranked.sort(
    (left, right) => (left.standing.rank as number) - (right.standing.rank as number),
  )[0];
}

/** "Preseason-to-date · as of Aug 23, 2026 · IND 2 games / CAR 3 games". */
export function briefStatusLine(
  snapshot: LensSnapshot,
  teamA: TeamMetricRow,
  teamB: TeamMetricRow,
  labelA: string,
  labelB: string,
): string {
  return `${snapshot.windowLabel} · as of ${snapshot.asOfDate} · ${labelA} ${teamA.gamesInWindow} games / ${labelB} ${teamB.gamesInWindow} games`;
}

export function buildGameBrief(
  snapshot: LensSnapshot,
  teamA: TeamMetricRow,
  teamB: TeamMetricRow,
  labelA: string,
  labelB: string,
): GameBrief {
  const gaps = lensGaps(scoreAllLenses(snapshot, teamA), scoreAllLenses(snapshot, teamB));
  const { largest, closest } = comparisonHighlights(gaps);
  const directions = collisionDirections(snapshot, teamA, teamB);
  const { strongest } = collisionHighlights(directions);

  const observations: BriefObservation[] = [];

  for (const [team, label] of [
    [teamA, labelA],
    [teamB, labelB],
  ] as const) {
    const best = bestLens(snapshot, team);
    if (!best) continue;
    observations.push({
      id: `best-${team.teamAbv}`,
      lensKey: best.key,
      text: `${label} is at its strongest in ${best.name}.`,
      detail: `${ordinal(best.standing.rank as number)} of ${best.standing.total} in the league · ${best.standing.tier}.`,
    });
  }

  if (strongest) {
    const lane = strongest.lane;
    const winner =
      lane.leader === "offense" ? strongest.direction.offenseAbv : strongest.direction.defenseAbv;
    observations.push({
      id: "collision",
      collisionKey: lane.key,
      text: `With ${strongest.direction.offenseAbv} holding the ball, ${lane.definition.name.toLowerCase()} is the widest supported profile collision.`,
      detail: `Leans ${winner} by ${Math.abs(lane.edge ?? 0).toFixed(1)} Lens Score points · profile matchup, not a forecast.`,
    });
  }

  const momentum = momentumReadiness([snapshot]);

  const caveats: string[] = [
    `Window: ${snapshot.windowLabel} · as of ${snapshot.asOfDate} · ${snapshot.gamesLabel}.`,
    `Sample size: ${labelA} ${teamA.gamesInWindow} games, ${labelB} ${teamB.gamesInWindow} games. Small samples move league-relative standings quickly.`,
    "Every value is a league-relative standing from a single snapshot, on a 0–100 scale.",
    momentum.note,
    "Rare events are excluded from every Lens Score, so they never move these numbers.",
  ];

  return {
    largest,
    closest,
    observations: observations.slice(0, 3),
    statusLine: briefStatusLine(snapshot, teamA, teamB, labelA, labelB),
    caveats,
    contextLabel: snapshot.contextLabel,
    gamesLabel: snapshot.gamesLabel,
  };
}
