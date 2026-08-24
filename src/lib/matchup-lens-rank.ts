// League standing helpers.
//
// Every rank here is computed from the same LensSnapshot the page already
// renders, using the same scoring engine. Nothing is fetched or invented.

import type { LensSnapshot } from "./matchup-lens-types";
import { LENSES, scoreLens } from "./matchup-lens";
import { tierLabel } from "./matchup-lens-language";

export interface LeagueStanding {
  rank: number | null;
  total: number;
  tier: string;
}

export interface LensScoreRow {
  teamAbv: string;
  score: number | null;
}

const lensTableCache = new WeakMap<LensSnapshot, Map<string, LensScoreRow[]>>();

/** All 32 team Lens Scores for one lens, in descending score order. */
export function lensScoreTable(snapshot: LensSnapshot, lensKey: string): LensScoreRow[] {
  let byLens = lensTableCache.get(snapshot);
  if (!byLens) {
    byLens = new Map();
    lensTableCache.set(snapshot, byLens);
  }
  const cached = byLens.get(lensKey);
  if (cached) return cached;

  const lens = LENSES.find((entry) => entry.key === lensKey);
  const rows: LensScoreRow[] = lens
    ? snapshot.teams
        .map((team) => ({ teamAbv: team.teamAbv, score: scoreLens(lens, snapshot, team).score }))
        .sort((left, right) => (right.score ?? -1) - (left.score ?? -1))
    : [];

  byLens.set(lensKey, rows);
  return rows;
}

/** Competition rank of one team's Lens Score among every team in the snapshot. */
export function lensStanding(
  snapshot: LensSnapshot,
  lensKey: string,
  teamAbv: string,
): LeagueStanding {
  const rows = lensScoreTable(snapshot, lensKey);
  const scored = rows.filter((row) => row.score !== null);
  const total = scored.length;
  const mine = rows.find((row) => row.teamAbv === teamAbv)?.score ?? null;
  if (mine === null || total === 0) return { rank: null, total, tier: "Unranked" };
  const better = scored.filter((row) => (row.score as number) > mine).length;
  const rank = better + 1;
  return { rank, total, tier: tierLabel(rank, total) };
}

/** Competition rank on a single metric's league percentile. */
export function metricStanding(
  snapshot: LensSnapshot,
  metric: string,
  teamAbv: string,
): LeagueStanding {
  const values = snapshot.teams
    .map((team) => team.percentiles[metric])
    .filter((value): value is number => typeof value === "number");
  const mine = snapshot.teams.find((team) => team.teamAbv === teamAbv)?.percentiles[metric];
  const total = values.length;
  if (typeof mine !== "number" || total === 0) return { rank: null, total, tier: "Unranked" };
  const better = values.filter((value) => value > mine).length;
  const rank = better + 1;
  return { rank, total, tier: tierLabel(rank, total) };
}
