// Directional matchup collisions.
//
// A collision only exists where the current snapshot actually carries metrics
// on both sides of the interaction. Where a counterpart metric is missing the
// collision reports reduced coverage instead of inventing symmetry.

import type { LensSnapshot, TeamMetricRow } from "./matchup-lens-types";
import { metricWeight } from "./matchup-lens";

export type CoverageState = "ready" | "partial" | "not-supported";

export interface CollisionDefinition {
  key: string;
  name: string;
  /** One sentence describing the interaction in plain English. */
  question: string;
  /** Metrics describing the team that has the ball. */
  offenseMetrics: string[];
  offenseLabel: string;
  /** Metrics describing the team defending. */
  defenseMetrics: string[];
  defenseLabel: string;
}

export const COLLISIONS: CollisionDefinition[] = [
  {
    key: "protection-vs-disruption",
    name: "Protection vs Disruption",
    question: "Can the team with the ball keep the quarterback clean against this pass rush?",
    offenseMetrics: ["sacks_taken", "sack_yards_lost"],
    offenseLabel: "Protection",
    defenseMetrics: ["sacks"],
    defenseLabel: "Pass rush",
  },
  {
    key: "giveaways-vs-takeaways",
    name: "Ball Security vs Takeaways",
    question: "Does the team with the ball give it away against a defense that takes it away?",
    offenseMetrics: ["interceptions_thrown", "fumbles_lost", "turnovers"],
    offenseLabel: "Ball security",
    defenseMetrics: ["defensive_interceptions", "fumbles_recovered"],
    defenseLabel: "Takeaways",
  },
  {
    key: "scoring-vs-resistance",
    name: "Scoring vs Scoring Resistance",
    question: "Does this offense turn possessions into points against this scoring defense?",
    offenseMetrics: ["points_per_play", "td_rate", "red_zone_efficiency"],
    offenseLabel: "Scoring offense",
    defenseMetrics: ["points_allowed_per_play"],
    defenseLabel: "Scoring resistance",
  },
];

export interface CollisionMetricValue {
  metric: string;
  label: string;
  percentile: number | null;
  weight: number;
}

export interface CollisionSide {
  label: string;
  teamAbv: string;
  score: number | null;
  metrics: CollisionMetricValue[];
  missing: string[];
}

export interface CollisionLane {
  key: string;
  definition: CollisionDefinition;
  /** Team with the ball. */
  offense: CollisionSide;
  /** Team defending. */
  defense: CollisionSide;
  coverage: CoverageState;
  /** offense score minus defense score, only when coverage is "ready". */
  edge: number | null;
  /** "offense" | "defense" | "even", only when coverage is "ready". */
  leader: "offense" | "defense" | "even" | null;
  coverageNote: string;
}

function buildSide(
  snapshot: LensSnapshot,
  team: TeamMetricRow,
  label: string,
  metrics: string[],
): CollisionSide {
  const byKey = new Map(snapshot.metrics.map((definition) => [definition.metric, definition]));
  const values: CollisionMetricValue[] = [];
  const missing: string[] = [];
  let weighted = 0;
  let totalWeight = 0;

  for (const metric of metrics) {
    const definition = byKey.get(metric);
    const percentile = team.percentiles[metric];
    if (!definition || typeof percentile !== "number") {
      missing.push(metric);
      continue;
    }
    const weight = metricWeight(definition);
    weighted += percentile * weight;
    totalWeight += weight;
    values.push({ metric, label: definition.label, percentile, weight });
  }

  return {
    label,
    teamAbv: team.teamAbv,
    score: totalWeight > 0 ? weighted / totalWeight : null,
    metrics: values,
    missing,
  };
}

function coverageFor(offense: CollisionSide, defense: CollisionSide): CoverageState {
  if (offense.metrics.length === 0 || defense.metrics.length === 0) return "not-supported";
  if (offense.missing.length > 0 || defense.missing.length > 0) return "partial";
  return "ready";
}

function coverageNote(coverage: CoverageState, offense: CollisionSide, defense: CollisionSide): string {
  if (coverage === "ready") {
    return `Both sides of this interaction are covered by ${offense.metrics.length + defense.metrics.length} metrics in the current snapshot.`;
  }
  if (coverage === "partial") {
    const missing = [...offense.missing, ...defense.missing].length;
    return `${missing} contributing metric${missing === 1 ? " is" : "s are"} missing from the current snapshot, so no edge is declared.`;
  }
  return "The current snapshot does not carry a counterpart metric for one side, so this interaction cannot be compared.";
}

/** Builds one directional lane: `offenseTeam` has the ball against `defenseTeam`. */
export function collisionLane(
  snapshot: LensSnapshot,
  definition: CollisionDefinition,
  offenseTeam: TeamMetricRow,
  defenseTeam: TeamMetricRow,
): CollisionLane {
  const offense = buildSide(snapshot, offenseTeam, definition.offenseLabel, definition.offenseMetrics);
  const defense = buildSide(snapshot, defenseTeam, definition.defenseLabel, definition.defenseMetrics);
  const coverage = coverageFor(offense, defense);
  const comparable = coverage === "ready" && offense.score !== null && defense.score !== null;
  const edge = comparable ? (offense.score as number) - (defense.score as number) : null;

  return {
    key: definition.key,
    definition,
    offense,
    defense,
    coverage,
    edge,
    leader: edge === null ? null : edge === 0 ? "even" : edge > 0 ? "offense" : "defense",
    coverageNote: coverageNote(coverage, offense, defense),
  };
}

export interface CollisionDirection {
  /** Team with the ball. */
  offenseAbv: string;
  defenseAbv: string;
  lanes: CollisionLane[];
}

export function collisionDirections(
  snapshot: LensSnapshot,
  teamA: TeamMetricRow,
  teamB: TeamMetricRow,
): CollisionDirection[] {
  return [
    {
      offenseAbv: teamA.teamAbv,
      defenseAbv: teamB.teamAbv,
      lanes: COLLISIONS.map((definition) => collisionLane(snapshot, definition, teamA, teamB)),
    },
    {
      offenseAbv: teamB.teamAbv,
      defenseAbv: teamA.teamAbv,
      lanes: COLLISIONS.map((definition) => collisionLane(snapshot, definition, teamB, teamA)),
    },
  ];
}

export interface CollisionHighlights {
  strongest: { direction: CollisionDirection; lane: CollisionLane } | null;
  closest: { direction: CollisionDirection; lane: CollisionLane } | null;
}

/** Only "ready" lanes are eligible to be highlighted. */
export function collisionHighlights(directions: CollisionDirection[]): CollisionHighlights {
  const supported = directions.flatMap((direction) =>
    direction.lanes
      .filter((lane) => lane.coverage === "ready" && lane.edge !== null)
      .map((lane) => ({ direction, lane })),
  );
  if (supported.length === 0) return { strongest: null, closest: null };
  const ordered = [...supported].sort(
    (left, right) => Math.abs(right.lane.edge as number) - Math.abs(left.lane.edge as number),
  );
  return { strongest: ordered[0], closest: ordered[ordered.length - 1] };
}
