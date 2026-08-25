// Insight Ticker stories.
//
// Deterministic, ordered matchup stories assembled from values the scoring
// engine already produced. No new football meaning, no probability, no
// forecast: every sentence restates a league-relative standing that already
// exists elsewhere in the model.

import type { LensSnapshot, TeamMetricRow } from "./matchup-lens-types";
import type { LensGap } from "./matchup-lens-compare";
import { comparisonHighlights } from "./matchup-lens-compare";
import { collisionHighlights, type CollisionDirection } from "./matchup-lens-collision";
import {
  PROFILE_ANGLE_DISCLAIMER,
  TURNOVER_WATCH_EXPLANATION,
  type ProfileAngle,
} from "./matchup-lens-angle";
import { LENSES } from "./matchup-lens";
import { lensStanding } from "./matchup-lens-rank";
import { lensDefinition, lensStrengthPhrase } from "./matchup-lens-glossary";
import { ordinal } from "./matchup-lens-language";

export type StoryTarget =
  | { kind: "lens"; lensKey: string }
  | { kind: "collision"; collisionKey: string };

export interface InsightStory {
  id: string;
  /** Small uppercase label above the sentence. */
  category: string;
  /** One plain-English sentence. */
  sentence: string;
  /** Compact rank / gap support beneath the sentence. */
  support: string;
  /** Explicit call to action, e.g. "Explore Turnover Balance". */
  ctaLabel: string;
  target: StoryTarget;
  /** Contents of the "Why this appears" disclosure, when the story is derived. */
  why?: string;
  /** Standing disclaimer for derived signals. */
  note?: string;
}

/** Best-ranked lens for one team, ignoring lenses without a score. */
function bestLensKey(snapshot: LensSnapshot, team: TeamMetricRow) {
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

function leaderLabel(gap: LensGap, labelA: string, labelB: string): string {
  if (gap.leader === "a") return `${labelA} ahead`;
  if (gap.leader === "b") return `${labelB} ahead`;
  return "Even";
}

export interface StoryInput {
  snapshot: LensSnapshot;
  teamA: TeamMetricRow;
  teamB: TeamMetricRow;
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  gaps: LensGap[];
  angle: ProfileAngle | null;
  directions: CollisionDirection[];
}

/**
 * Around five stories, always in the same order so the ticker is reproducible:
 * biggest edge, closest matchup, Turnover Watch (when supported), each team's
 * clearest identity, and the strongest supported collision when it is distinct.
 */
export function buildInsightStories(input: StoryInput): InsightStory[] {
  const { snapshot, teamA, teamB, labelA, labelB, nameA, nameB, gaps, angle, directions } = input;
  const stories: InsightStory[] = [];
  const { largest, closest } = comparisonHighlights(gaps);

  if (largest) {
    stories.push({
      id: "biggest-edge",
      category: "Biggest edge",
      sentence: `The widest profile difference in this matchup is ${largest.name}.`,
      support: `${(largest.absGap ?? 0).toFixed(1)} points apart · ${leaderLabel(largest, labelA, labelB)} · ${labelA} ${(largest.scoreA ?? 0).toFixed(1)} / ${labelB} ${(largest.scoreB ?? 0).toFixed(1)}`,
      ctaLabel: `Compare ${largest.name}`,
      target: { kind: "lens", lensKey: largest.key },
      why: `${lensDefinition(largest.key)} This is the largest gap between the two league-relative Lens Scores in this matchup.`,
    });
  }

  if (closest && closest.key !== largest?.key) {
    stories.push({
      id: "closest-matchup",
      category: "Closest matchup",
      sentence: `${closest.name} is where the two profiles are hardest to separate.`,
      support: `${(closest.absGap ?? 0).toFixed(1)} points apart · ${leaderLabel(closest, labelA, labelB)} · ${labelA} ${(closest.scoreA ?? 0).toFixed(1)} / ${labelB} ${(closest.scoreB ?? 0).toFixed(1)}`,
      ctaLabel: `Compare ${closest.name}`,
      target: { kind: "lens", lensKey: closest.key },
      why: `${lensDefinition(closest.key)} This is the smallest gap between the two league-relative Lens Scores in this matchup.`,
    });
  }

  if (angle?.id === "turnover-watch" && angle.values) {
    const { takeawayLabel, takeaways, securityLabel, security } = angle.values;
    stories.push({
      id: "turnover-watch",
      category: "Turnover Watch",
      sentence: angle.sentence,
      support: `${takeawayLabel} takeaway profile ${takeaways.toFixed(1)} · ${securityLabel} ball security ${security.toFixed(1)} · ${angle.values.separation.toFixed(1)} points apart`,
      ctaLabel: "Explore Turnover Balance",
      target: { kind: "lens", lensKey: angle.lensKey ?? "turnover-balance" },
      why: TURNOVER_WATCH_EXPLANATION,
      note: PROFILE_ANGLE_DISCLAIMER,
    });
  }

  for (const [team, label, name, id] of [
    [teamA, labelA, nameA, "identity-a"],
    [teamB, labelB, nameB, "identity-b"],
  ] as const) {
    const best = bestLensKey(snapshot, team);
    if (!best) continue;
    const rank = ordinal(best.standing.rank as number);
    stories.push({
      id,
      category: `${label} identity`,
      sentence: `${name}'s clearest strength is ${lensStrengthPhrase(best.key)}.`,
      support: `${best.name} · ${rank} of ${best.standing.total} · ${best.standing.tier}`,
      ctaLabel: `Explore ${best.name}`,
      target: { kind: "lens", lensKey: best.key },
      why: `${lensDefinition(best.key)} ${label} holds its highest league-relative Lens Score in this lens.`,
    });
  }

  const { strongest } = collisionHighlights(directions);
  if (strongest) {
    const winner =
      strongest.lane.leader === "offense"
        ? strongest.direction.offenseAbv
        : strongest.direction.defenseAbv;
    stories.push({
      id: "collision",
      category: "Profile collision",
      sentence: `With ${strongest.direction.offenseAbv} holding the ball, ${strongest.lane.definition.name.toLowerCase()} is the widest supported profile collision.`,
      support: `Leans ${winner} by ${Math.abs(strongest.lane.edge ?? 0).toFixed(1)} points · ${strongest.lane.definition.question}`,
      ctaLabel: "See where profiles collide",
      target: { kind: "collision", collisionKey: strongest.lane.key },
      why: "A collision pairs the team holding the ball against the opposing side of the same interaction. Only pairings the snapshot supports on both sides are shown.",
      note: "Profile matchup, not a forecast.",
    });
  }

  return stories;
}
