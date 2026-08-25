// Profile angle: one supported, non-duplicative observation for the dashboard.
//
// The preferred angle is Turnover Watch, because ball security and takeaways are
// carried on both sides of the snapshot. Everything here is deterministic
// arithmetic over league percentiles already produced upstream. No probability,
// no forecast, no betting language.

import type { LensSnapshot, TeamMetricRow } from "./matchup-lens-types";
import type { LensGap } from "./matchup-lens-compare";
import { sortBySeparation } from "./matchup-lens-compare";

/** Percentiles are polarity-corrected upstream: higher always means better. */
const BALL_SECURITY_METRICS = ["interceptions_thrown", "fumbles_lost", "turnovers"];
const TAKEAWAY_METRICS = ["defensive_interceptions", "fumbles_recovered"];

/** Minimum league-relative separation before the angle is worth surfacing. */
export const TURNOVER_WATCH_MIN_SEPARATION = 12;

export interface TurnoverProfile {
  teamAbv: string;
  /** Average league standing on giveaway metrics; higher means safer with the ball. */
  ballSecurity: number | null;
  /** Average league standing on takeaway metrics; higher means more takeaways. */
  takeaways: number | null;
  covered: boolean;
}

function average(team: TeamMetricRow, metrics: string[]): number | null {
  const values = metrics
    .map((metric) => team.percentiles[metric])
    .filter((value): value is number => typeof value === "number");
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function turnoverProfile(team: TeamMetricRow): TurnoverProfile {
  const ballSecurity = average(team, BALL_SECURITY_METRICS);
  const takeaways = average(team, TAKEAWAY_METRICS);
  return {
    teamAbv: team.teamAbv,
    ballSecurity,
    takeaways,
    covered: ballSecurity !== null && takeaways !== null,
  };
}

export interface TurnoverWatchValues {
  takeawayLabel: string;
  takeaways: number;
  securityLabel: string;
  security: number;
  separation: number;
}

export interface ProfileAngle {
  id: "turnover-watch" | "profile-gap";
  title: string;
  /** Plain-language sentence, safe to read on its own. */
  sentence: string;
  /** League-relative support beneath the sentence. */
  support: string;
  lensKey?: string;
  collisionKey?: string;
  /** Derived profile standings behind Turnover Watch, for the explanation. */
  values?: TurnoverWatchValues;
}

export const PROFILE_ANGLE_DISCLAIMER = "Profile signal, not a prediction.";

/** Shown behind "Why this appears" wherever Turnover Watch is surfaced. */
export const TURNOVER_WATCH_EXPLANATION =
  "Takeaway profile combines defensive interceptions and fumbles recovered. Ball security combines fewer interceptions thrown, fewer fumbles lost, and fewer turnovers. These are league-relative profile standings. This is not an event probability or prediction.";


function betterThan(value: number): string {
  return `better than ${value.toFixed(1)}% of teams`;
}

/**
 * Turnover Watch when both sides are covered and the separation is meaningful,
 * otherwise the strongest remaining lens gap that is not already on screen.
 */
export function buildProfileAngle(
  _snapshot: LensSnapshot,
  teamA: TeamMetricRow,
  teamB: TeamMetricRow,
  labelA: string,
  labelB: string,
  gaps: LensGap[],
  excludeLensKeys: string[] = [],
): ProfileAngle | null {
  const profileA = turnoverProfile(teamA);
  const profileB = turnoverProfile(teamB);

  if (profileA.covered && profileB.covered) {
    const candidates = [
      {
        takeawayLabel: labelA,
        takeaways: profileA.takeaways as number,
        securityLabel: labelB,
        security: profileB.ballSecurity as number,
      },
      {
        takeawayLabel: labelB,
        takeaways: profileB.takeaways as number,
        securityLabel: labelA,
        security: profileA.ballSecurity as number,
      },
    ];
    const best = candidates.sort(
      (left, right) => right.takeaways - right.security - (left.takeaways - left.security),
    )[0];

    if (best.takeaways - best.security >= TURNOVER_WATCH_MIN_SEPARATION) {
      return {
        id: "turnover-watch",
        title: "Turnover Watch",
        sentence: `${best.takeawayLabel}'s takeaway profile meets a ${best.securityLabel} offence with a weaker ball-security standing.`,
        support: `${best.takeawayLabel} takeaways ${betterThan(best.takeaways)} · ${
          best.securityLabel
        } ball security ${betterThan(best.security)}.`,
        lensKey: "turnover-balance",
        collisionKey: "giveaways-vs-takeaways",
        values: {
          takeawayLabel: best.takeawayLabel,
          takeaways: best.takeaways,
          securityLabel: best.securityLabel,
          security: best.security,
          separation: best.takeaways - best.security,
        },
      };
    }
  }

  const remaining = sortBySeparation(
    gaps.filter((gap) => gap.absGap !== null && !excludeLensKeys.includes(gap.key)),
  );
  const next = remaining[0];
  if (!next) return null;

  const leader = next.leader === "a" ? labelA : next.leader === "b" ? labelB : null;
  return {
    id: "profile-gap",
    title: "Profile angle",
    sentence: leader
      ? `${leader} carries the stronger ${next.name} profile in this matchup.`
      : `${next.name} is level between these two profiles.`,
    support: `${labelA} ${(next.scoreA ?? 0).toFixed(1)} / 100 · ${labelB} ${(
      next.scoreB ?? 0
    ).toFixed(1)} / 100 · ${(next.absGap ?? 0).toFixed(1)} points apart.`,
    lensKey: next.key,
  };
}
