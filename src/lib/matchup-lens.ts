// Matchup Lens scoring engine.
//
// Applies the fixed product rules to a `LensSnapshot`. All football meaning
// (lens membership, signal strength, rare-event flags) comes from the snapshot's
// tags; this module only applies the agreed weighting arithmetic.

import type { LensSnapshot, MetricDefinition, TeamMetricRow } from "./matchup-lens-types";

export interface LensDefinition {
  key: string;
  name: string;
  /** Tags that pull a metric into this lens. */
  tags: string[];
  /** Tags that push a metric back out of this lens. */
  excludeTags?: string[];
}

/** Rare events never move the primary shape. */
export const RARE_EVENT_TAG = "rare-event";

export const LENSES: LensDefinition[] = [
  {
    key: "explosiveness",
    name: "Explosiveness",
    tags: ["explosiveness", "offensive-efficiency", "passing-efficiency", "rushing-efficiency"],
  },
  {
    key: "drive-control",
    name: "Drive Control",
    tags: ["drive-sustainability", "third-down", "fourth-down", "drive-efficiency", "drive-conversion"],
  },
  {
    key: "scoring-finish",
    name: "Scoring Finish",
    tags: [
      "scoring-efficiency",
      "scoring",
      "touchdowns",
      "red-zone",
      "touchdown-efficiency",
      "efficiency",
    ],
  },
  {
    key: "defensive-resistance",
    name: "Defensive Resistance",
    tags: ["defense", "scoring-suppression", "scoring-efficiency-allowed"],
    excludeTags: ["defensive-scoring", "swing-play"],
  },
  {
    key: "disruption-protection",
    name: "Disruption & Protection",
    tags: ["disruption", "negative-plays", "protection", "pressure-allowed"],
    excludeTags: ["blocked-kicks", "special-teams"],
  },
  {
    key: "turnover-balance",
    name: "Turnover Balance",
    tags: ["turnovers", "giveaways", "takeaways", "takeaway-margin"],
  },
];

/** Weight rules: strong = 2, otherwise 1; volume-sensitive x0.5; volatility x0.75. */
export function metricWeight(definition: MetricDefinition): number {
  let weight = definition.signalStrength === "strong" ? 2 : 1;
  if (definition.lensTags.includes("volume-sensitive")) weight *= 0.5;
  if (definition.lensTags.includes("volatility")) weight *= 0.75;
  return weight;
}

export function metricsForLens(lens: LensDefinition, metrics: MetricDefinition[]): MetricDefinition[] {
  const seen = new Set<string>();
  const result: MetricDefinition[] = [];
  for (const definition of metrics) {
    if (seen.has(definition.metric)) continue;
    if (definition.lensTags.includes(RARE_EVENT_TAG)) continue;
    if (lens.excludeTags?.some((tag) => definition.lensTags.includes(tag))) continue;
    if (!lens.tags.some((tag) => definition.lensTags.includes(tag))) continue;
    seen.add(definition.metric);
    result.push(definition);
  }
  return result;
}

export interface LensContribution {
  metric: string;
  label: string;
  signalStrength: MetricDefinition["signalStrength"];
  lensTags: string[];
  weight: number;
  percentile: number;
}

export interface LensScore {
  lensKey: string;
  lensName: string;
  /** Weighted average of league percentiles, or null when no metric is available. */
  score: number | null;
  contributions: LensContribution[];
}

export function scoreLens(
  lens: LensDefinition,
  snapshot: LensSnapshot,
  team: TeamMetricRow,
): LensScore {
  const contributions: LensContribution[] = [];
  let weighted = 0;
  let totalWeight = 0;

  for (const definition of metricsForLens(lens, snapshot.metrics)) {
    const percentile = team.percentiles[definition.metric];
    if (typeof percentile !== "number") continue;
    const weight = metricWeight(definition);
    weighted += percentile * weight;
    totalWeight += weight;
    contributions.push({
      metric: definition.metric,
      label: definition.label,
      signalStrength: definition.signalStrength,
      lensTags: definition.lensTags,
      weight,
      percentile,
    });
  }

  contributions.sort((a, b) => b.percentile - a.percentile);

  return {
    lensKey: lens.key,
    lensName: lens.name,
    score: totalWeight > 0 ? weighted / totalWeight : null,
    contributions,
  };
}

export function scoreAllLenses(snapshot: LensSnapshot, team: TeamMetricRow): LensScore[] {
  return LENSES.map((lens) => scoreLens(lens, snapshot, team));
}

export function findTeam(snapshot: LensSnapshot, teamAbv: string): TeamMetricRow | undefined {
  return snapshot.teams.find((team) => team.teamAbv === teamAbv);
}
