// Reverse trace: walk the lens ↔ tag ↔ metric graph in either direction.
//
// Every relationship comes from the snapshot's own tag mappings and the lens
// definitions in the scoring engine. Nothing here derives football meaning.

import type { LensSnapshot, MetricDefinition, TeamMetricRow } from "./matchup-lens-types";
import { LENSES, RARE_EVENT_TAG, metricWeight, metricsForLens } from "./matchup-lens";
import {
  betterThanText,
  influenceNotes,
  readableTag,
  signalRoleLabel,
} from "./matchup-lens-language";
import { metricStanding, type LeagueStanding } from "./matchup-lens-rank";

export type TraceTargetType = "tag" | "metric";

export interface TraceTarget {
  type: TraceTargetType;
  id: string;
}

export interface TeamMetricReading {
  teamAbv: string;
  percentile: number | null;
  standing: LeagueStanding;
  readable: string;
}

export interface TracedMetric {
  metric: string;
  label: string;
  roleLabel: string;
  influence: string[];
  weight: number;
  tags: string[];
  /** Lenses this metric can contribute to, given the current lens definitions. */
  lensKeys: string[];
  /** Included in the currently selected lens? */
  includedInSelectedLens: boolean;
  /** Why it is not included, when it is not. */
  exclusionReason: string | null;
  readings: TeamMetricReading[];
}

export interface TagTrace {
  type: "tag";
  tag: string;
  label: string;
  /** Lenses that consume this tag. */
  lenses: { key: string; name: string; excluded: boolean }[];
  metrics: TracedMetric[];
}

export interface MetricTrace {
  type: "metric";
  metric: string;
  label: string;
  roleLabel: string;
  influence: string[];
  tags: string[];
  lenses: { key: string; name: string }[];
  readings: TeamMetricReading[];
}

export type Trace = TagTrace | MetricTrace;

/** Lenses whose tag list can pull this metric in (exclusions applied). */
export function lensKeysForMetric(definition: MetricDefinition, snapshot: LensSnapshot): string[] {
  return LENSES.filter((lens) =>
    metricsForLens(lens, snapshot.metrics).some((entry) => entry.metric === definition.metric),
  ).map((lens) => lens.key);
}

function readings(
  snapshot: LensSnapshot,
  metric: string,
  teams: TeamMetricRow[],
): TeamMetricReading[] {
  return teams.map((team) => {
    const percentile = team.percentiles[metric];
    const value = typeof percentile === "number" ? percentile : null;
    return {
      teamAbv: team.teamAbv,
      percentile: value,
      standing: metricStanding(snapshot, metric, team.teamAbv),
      readable: betterThanText(value),
    };
  });
}

function exclusionReason(
  definition: MetricDefinition,
  selectedLensKey: string,
  snapshot: LensSnapshot,
): string | null {
  const lens = LENSES.find((entry) => entry.key === selectedLensKey);
  if (!lens) return "No lens selected.";
  const included = metricsForLens(lens, snapshot.metrics).some(
    (entry) => entry.metric === definition.metric,
  );
  if (included) return null;
  if (definition.lensTags.includes(RARE_EVENT_TAG)) {
    return "Rare event — excluded from every Lens Score.";
  }
  const blocked = lens.excludeTags?.find((tag) => definition.lensTags.includes(tag));
  if (blocked) return `Excluded from ${lens.name} by the ${readableTag(blocked)} rule.`;
  return `Not part of ${lens.name} — none of its tags belong to this lens.`;
}

function tracedMetric(
  snapshot: LensSnapshot,
  definition: MetricDefinition,
  selectedLensKey: string,
  teams: TeamMetricRow[],
): TracedMetric {
  const reason = exclusionReason(definition, selectedLensKey, snapshot);
  return {
    metric: definition.metric,
    label: definition.label,
    roleLabel: signalRoleLabel(definition.signalStrength),
    influence: influenceNotes(definition.lensTags),
    weight: metricWeight(definition),
    tags: definition.lensTags,
    lensKeys: lensKeysForMetric(definition, snapshot),
    includedInSelectedLens: reason === null,
    exclusionReason: reason,
    readings: readings(snapshot, definition.metric, teams),
  };
}

/** Tag → the lenses that consume it and every metric that carries it. */
export function buildTagTrace(
  snapshot: LensSnapshot,
  tag: string,
  selectedLensKey: string,
  teams: TeamMetricRow[],
): TagTrace {
  return {
    type: "tag",
    tag,
    label: readableTag(tag),
    lenses: LENSES.filter(
      (lens) => lens.tags.includes(tag) || lens.excludeTags?.includes(tag),
    ).map((lens) => ({
      key: lens.key,
      name: lens.name,
      excluded: Boolean(lens.excludeTags?.includes(tag)),
    })),
    metrics: snapshot.metrics
      .filter((definition) => definition.lensTags.includes(tag))
      .map((definition) => tracedMetric(snapshot, definition, selectedLensKey, teams)),
  };
}

/** Metric → its tags and every lens it can contribute to. */
export function buildMetricTrace(
  snapshot: LensSnapshot,
  metric: string,
  teams: TeamMetricRow[],
): MetricTrace | null {
  const definition = snapshot.metrics.find((entry) => entry.metric === metric);
  if (!definition) return null;
  const lensKeys = lensKeysForMetric(definition, snapshot);
  return {
    type: "metric",
    metric: definition.metric,
    label: definition.label,
    roleLabel: signalRoleLabel(definition.signalStrength),
    influence: influenceNotes(definition.lensTags),
    tags: definition.lensTags,
    lenses: LENSES.filter((lens) => lensKeys.includes(lens.key)).map((lens) => ({
      key: lens.key,
      name: lens.name,
    })),
    readings: readings(snapshot, definition.metric, teams),
  };
}

export function buildTrace(
  snapshot: LensSnapshot,
  target: TraceTarget,
  selectedLensKey: string,
  teams: TeamMetricRow[],
): Trace | null {
  if (target.type === "tag") return buildTagTrace(snapshot, target.id, selectedLensKey, teams);
  return buildMetricTrace(snapshot, target.id, teams);
}
