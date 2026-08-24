// Presentation-layer arithmetic for the Matchup Lens comparison views.
//
// These helpers only subtract and order numbers that the scoring engine already
// produced. No football meaning is derived here.

import type { EventPulseEntry, LensScore } from "./matchup-lens";
import { LENSES } from "./matchup-lens";

export type Side = "a" | "b";

export interface LensGap {
  key: string;
  name: string;
  scoreA: number | null;
  scoreB: number | null;
  /** scoreA - scoreB, or null when either side is missing. */
  gap: number | null;
  absGap: number | null;
  leader: Side | "tie" | null;
}

/** Pairs the two teams' lens scores in canonical lens order. */
export function lensGaps(scoresA: LensScore[], scoresB: LensScore[]): LensGap[] {
  const byKeyA = new Map(scoresA.map((score) => [score.lensKey, score]));
  const byKeyB = new Map(scoresB.map((score) => [score.lensKey, score]));

  return LENSES.map((lens) => {
    const scoreA = byKeyA.get(lens.key)?.score ?? null;
    const scoreB = byKeyB.get(lens.key)?.score ?? null;
    if (scoreA === null || scoreB === null) {
      return { key: lens.key, name: lens.name, scoreA, scoreB, gap: null, absGap: null, leader: null };
    }
    const gap = scoreA - scoreB;
    const leader: Side | "tie" = gap === 0 ? "tie" : gap > 0 ? "a" : "b";
    return { key: lens.key, name: lens.name, scoreA, scoreB, gap, absGap: Math.abs(gap), leader };
  });
}

/** Largest-separation-first ordering; lenses missing a score sink to the bottom. */
export function sortBySeparation(gaps: LensGap[]): LensGap[] {
  return [...gaps].sort((left, right) => {
    if (left.absGap === null && right.absGap === null) return 0;
    if (left.absGap === null) return 1;
    if (right.absGap === null) return -1;
    if (right.absGap !== left.absGap) return right.absGap - left.absGap;
    return left.name.localeCompare(right.name);
  });
}

export interface ComparisonHighlights {
  largest: LensGap | null;
  closest: LensGap | null;
}

export function comparisonHighlights(gaps: LensGap[]): ComparisonHighlights {
  const scored = gaps.filter((gap) => gap.absGap !== null);
  if (scored.length === 0) return { largest: null, closest: null };
  const ordered = sortBySeparation(scored);
  return { largest: ordered[0], closest: ordered[ordered.length - 1] };
}

export interface EventPulsePair {
  metric: string;
  label: string;
  a: EventPulseEntry;
  b: EventPulseEntry;
  /** True when the two teams sit at different percentiles on this rare event. */
  differs: boolean;
}

/** Pairs rare-event rows and flags the ones where the two teams actually differ. */
export function eventPulsePairs(
  entriesA: EventPulseEntry[],
  entriesB: EventPulseEntry[],
): EventPulsePair[] {
  const byMetricB = new Map(entriesB.map((entry) => [entry.metric, entry]));
  const pairs: EventPulsePair[] = [];

  for (const a of entriesA) {
    const b = byMetricB.get(a.metric);
    if (!b) continue;
    pairs.push({
      metric: a.metric,
      label: a.label,
      a,
      b,
      differs: a.percentile !== b.percentile,
    });
  }

  return pairs;
}
