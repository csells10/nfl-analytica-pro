// Game Brief: deterministic statements assembled from values the scoring engine
// already produced. No prediction, no win probability, no invented meaning.

import type { LensSnapshot, TeamMetricRow } from "./matchup-lens-types";
import { LENSES, scoreAllLenses } from "./matchup-lens";
import { comparisonHighlights, lensGaps, type LensGap } from "./matchup-lens-compare";
import { collisionDirections, collisionHighlights } from "./matchup-lens-collision";
import { lensStanding } from "./matchup-lens-rank";
import { ordinal } from "./matchup-lens-language";

export interface BriefObservation {
  id: string;
  text: string;
  /** Lens this observation opens. */
  lensKey?: string;
  /** Collision lane this observation opens. */
  collisionKey?: string;
}

export interface GameBrief {
  largest: LensGap | null;
  closest: LensGap | null;
  observations: BriefObservation[];
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

  if (largest) {
    const leader = largest.leader === "a" ? labelA : largest.leader === "b" ? labelB : "Neither team";
    observations.push({
      id: "largest",
      lensKey: largest.key,
      text: `${leader} holds the widest league-relative separation in ${largest.name}: ${(largest.absGap ?? 0).toFixed(1)} points of Lens Score.`,
    });
  }

  for (const [team, label] of [
    [teamA, labelA],
    [teamB, labelB],
  ] as const) {
    const best = bestLens(snapshot, team);
    if (!best) continue;
    observations.push({
      id: `best-${team.teamAbv}`,
      lensKey: best.key,
      text: `${label} ranks ${ordinal(best.standing.rank as number)} of ${best.standing.total} in ${best.name}, its strongest league standing of the six lenses.`,
    });
  }

  if (strongest) {
    const lane = strongest.lane;
    const winner = lane.leader === "offense" ? strongest.direction.offenseAbv : strongest.direction.defenseAbv;
    observations.push({
      id: "collision",
      collisionKey: lane.key,
      text: `With ${strongest.direction.offenseAbv} holding the ball, ${lane.definition.name} shows the widest supported collision gap, favouring ${winner} by ${Math.abs(lane.edge ?? 0).toFixed(1)} points.`,
    });
  }

  const caveats: string[] = [
    `Window: ${snapshot.windowLabel} · as of ${snapshot.asOfDate} · ${snapshot.gamesLabel}.`,
    `Sample size: ${labelA} ${teamA.gamesInWindow} games, ${labelB} ${teamB.gamesInWindow} games. Small samples move league-relative standings quickly.`,
    "All values are league-relative standings from a single snapshot. No week-over-week movement is available yet.",
    "Rare events are excluded from every Lens Score, so they never move these numbers.",
  ];

  return {
    largest,
    closest,
    observations: observations.slice(0, 4),
    caveats,
    contextLabel: snapshot.contextLabel,
    gamesLabel: snapshot.gamesLabel,
  };
}
