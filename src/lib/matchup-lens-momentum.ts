// Momentum readiness.
//
// Movement is only shown when the source actually serves comparable windows.
// The granularity ladder below decides *how* change may be drawn once history
// exists; with a single snapshot nothing is drawn at all.

import type { LensSnapshot } from "./matchup-lens-types";

export type MomentumGranularity = "none" | "cards" | "dots" | "line";

export interface MomentumReadiness {
  /** Distinct comparable windows the source can serve. */
  windows: string[];
  periods: number;
  /** Two comparable windows are the minimum for any movement statement. */
  eligible: boolean;
  granularity: MomentumGranularity;
  /** Plain-English reason, shown inside data readiness. */
  note: string;
}

export function momentumReadiness(snapshots: LensSnapshot[]): MomentumReadiness {
  const windows = Array.from(new Set(snapshots.map((snapshot) => snapshot.windowLabel)));
  const periods = windows.length;
  const eligible = periods >= 2;

  const granularity: MomentumGranularity =
    periods >= 8 ? "line" : periods >= 5 ? "dots" : periods >= 2 ? "cards" : "none";

  const note = eligible
    ? `${periods} comparable windows available — movement is shown as ${
        granularity === "line" ? "a trend line" : granularity === "dots" ? "period dots" : "change cards"
      }.`
    : `Movement needs two comparable windows. The source currently serves one (${
        windows[0] ?? "unknown"
      }), so no direction is shown and no trend is drawn.`;

  return { windows, periods, eligible, granularity, note };
}
