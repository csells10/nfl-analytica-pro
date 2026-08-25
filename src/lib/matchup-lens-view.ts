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

// ---------------------------------------------------------------------------
// Origin ("where did I come from") state.
//
// Focused views keep one contextual return action. The origin travels in the
// URL so a shared link and the browser Back button behave the same way.

export type LensOrigin =
  | "overview"
  | "constellation"
  | "all-lenses"
  | "ticker"
  | "brief"
  | "biggest-edge"
  | "collision";

export const LENS_ORIGINS: LensOrigin[] = [
  "overview",
  "constellation",
  "all-lenses",
  "ticker",
  "brief",
  "biggest-edge",
  "collision",
];

/** Unknown / stale origins fail safely to the Overview. */
export function parseOrigin(raw: string | null): LensOrigin {
  return LENS_ORIGINS.find((entry) => entry === raw) ?? "overview";
}

export interface OriginReturn {
  view: LensView;
  label: string;
  shortLabel: string;
}

export function originReturn(origin: LensOrigin): OriginReturn {
  switch (origin) {
    case "constellation":
      return { view: "constellation", label: "Back to Constellation", shortLabel: "Constellation" };
    case "all-lenses":
      return { view: "lenses", label: "Back to all lenses", shortLabel: "All lenses" };
    case "collision":
      return { view: "collision", label: "Back to collisions", shortLabel: "Collisions" };
    default:
      return { view: "overview", label: "Back to Overview", shortLabel: "Overview" };
  }
}

