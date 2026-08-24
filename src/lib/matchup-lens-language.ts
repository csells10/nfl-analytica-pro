// Plain-English translation layer for the Matchup Lens.
//
// The scoring engine speaks in tags, weights and percentiles. Everything a user
// reads on screen is produced here so the wording stays consistent across every
// experience and no raw jargon leaks into the interface.

import type { LensContribution } from "./matchup-lens";

export const LENS_SCORE_NAME = "Lens Score";

export const LENS_SCORE_EXPLANATION =
  "A league-relative summary of the supporting metrics below. Higher means a stronger profile; it is not a prediction.";

export const LENS_SCORE_MATH =
  "Each supporting metric contributes its league-relative standing. Primary signals count double. Volume-sensitive metrics are halved and volatile metrics are reduced to three-quarters. The Lens Score is the weighted average of those standings on a 0–100 scale.";

/** Tag keys whose auto-generated title case reads badly. */
const TAG_LABEL_OVERRIDES: Record<string, string> = {
  "third-down": "Third Down",
  "fourth-down": "Fourth Down",
  "red-zone": "Red Zone",
  "rare-event": "Rare Event",
  "volume-sensitive": "Volume Sensitive",
  "small-sample": "Small Sample",
  "scoring-efficiency-allowed": "Scoring Efficiency Allowed",
  "takeaway-margin": "Takeaway Margin",
  "pressure-allowed": "Pressure Allowed",
  "negative-plays": "Negative Plays",
  "defensive-scoring": "Defensive Scoring",
  "swing-play": "Swing Play",
  "special-teams": "Special Teams",
  "blocked-kicks": "Blocked Kicks",
};

/** Turns a raw hyphenated lens tag into a readable label. */
export function readableTag(tag: string): string {
  const override = TAG_LABEL_OVERRIDES[tag];
  if (override) return override;
  return tag
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export type SignalRole = "primary" | "supporting";

export function signalRole(strength: LensContribution["signalStrength"]): SignalRole {
  return strength === "strong" ? "primary" : "supporting";
}

export function signalRoleLabel(strength: LensContribution["signalStrength"]): string {
  return strength === "strong" ? "Primary signal" : "Supporting context";
}

/** Plain-English replacements for the raw weight multipliers. */
export function influenceNotes(lensTags: string[]): string[] {
  const notes: string[] = [];
  if (lensTags.includes("volume-sensitive")) notes.push("Reduced influence: volume-sensitive");
  if (lensTags.includes("volatility")) notes.push("Reduced influence: volatility");
  if (lensTags.includes("small-sample")) notes.push("Small sample");
  return notes;
}

export function ordinal(value: number): string {
  const mod100 = value % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${value}th`;
  switch (value % 10) {
    case 1:
      return `${value}st`;
    case 2:
      return `${value}nd`;
    case 3:
      return `${value}rd`;
    default:
      return `${value}th`;
  }
}

/** Neutral standing labels — no praise, no judgement about future results. */
export function tierLabel(rank: number, total: number): string {
  if (total <= 0) return "Unranked";
  const share = rank / total;
  if (share <= 0.25) return "Top quartile";
  if (share <= 0.5) return "Upper middle";
  if (share <= 0.75) return "Lower middle";
  return "Bottom quartile";
}

export function scoreText(score: number | null): string {
  return score === null ? "— / 100" : `${score.toFixed(1)} / 100`;
}

export function rankText(rank: number | null, total: number): string {
  return rank === null ? "Unranked" : `${ordinal(rank)} of ${total}`;
}

/** Percentiles read as a sentence rather than an unexplained decimal. */
export function betterThanText(percentile: number | null): string {
  if (percentile === null) return "No league-relative value available";
  return `Better than ${percentile.toFixed(1)}% of teams`;
}
