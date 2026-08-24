// Modular data source for the Matchup Lens page.
//
// Today this resolves a static snapshot generated from the verified
// 2026-08-23 preseason-to-date export. Swapping in a Game API response later
// only requires a different `LensSnapshotSource` implementation — the page and
// scoring engine consume the `LensSnapshot` interface, not the file.

import type { LensSnapshot } from "./matchup-lens-types";
import { PRESEASON_2026_SNAPSHOT } from "./matchup-lens-snapshot";

export interface LensSnapshotSource {
  id: string;
  load: () => Promise<LensSnapshot>;
}

export const staticLensSnapshotSource: LensSnapshotSource = {
  id: "static-preseason-2026-08-23",
  load: async () => PRESEASON_2026_SNAPSHOT,
};

let activeSource: LensSnapshotSource = staticLensSnapshotSource;

export function setLensSnapshotSource(source: LensSnapshotSource): void {
  activeSource = source;
}

export function getLensSnapshotSource(): LensSnapshotSource {
  return activeSource;
}
