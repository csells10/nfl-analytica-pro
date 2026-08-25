// Matchup Dashboard view state.
//
// The page is a hub and spoke: the Overview is a small orientation surface, and
// every other view is a focused destination that replaces the canvas. Legacy
// `mode=` links from earlier builds are mapped forward so shared URLs keep
// working.

export type LensView =
  | "overview"
  | "constellation"
  | "lens"
  | "lenses"
  | "collision"
  | "gaps"
  | "momentum";

export type ConstellationLayout = "overlay" | "side";

export const LENS_VIEWS: LensView[] = [
  "overview",
  "constellation",
  "lens",
  "lenses",
  "collision",
  "gaps",
  "momentum",
];

/** Older links used `mode=` with one entry per chart experiment. */
const LEGACY_MODE_MAP: Record<string, { view: LensView; layout?: ConstellationLayout }> = {
  brief: { view: "overview" },
  constellation: { view: "constellation" },
  fingerprint: { view: "constellation", layout: "side" },
  map: { view: "gaps" },
  collision: { view: "collision" },
  momentum: { view: "momentum" },
  galaxy: { view: "overview" },
  portrait: { view: "overview" },
};

export interface ParsedView {
  view: LensView;
  layout: ConstellationLayout;
}

export function parseView(viewParam: string | null, modeParam: string | null): ParsedView {
  const direct = LENS_VIEWS.find((entry) => entry === viewParam);
  if (direct) return { view: direct, layout: "overlay" };
  const legacy = modeParam ? LEGACY_MODE_MAP[modeParam] : undefined;
  if (legacy) return { view: legacy.view, layout: legacy.layout ?? "overlay" };
  return { view: "overview", layout: "overlay" };
}

export function parseLayout(raw: string | null, fallback: ConstellationLayout): ConstellationLayout {
  if (raw === "side" || raw === "overlay") return raw;
  return fallback;
}

export const VIEW_TITLES: Record<LensView, string> = {
  overview: "Overview",
  constellation: "Constellation",
  lens: "Lens detail",
  lenses: "All six lenses",
  collision: "Where profiles collide",
  gaps: "Top profile gaps",
  momentum: "Momentum",
};
