import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Route-aware guide registry.
 *
 * One shared event (`gamelens:open-guide`) still drives Help, but it now
 * carries the guide id so exactly one page can respond to a single click.
 */
export type GuideId = "matchups" | "game-detail" | "matchup-lab";

export const GUIDE_EVENT = "gamelens:open-guide";

/** Versioned, guide-specific localStorage keys. Never stored remotely. */
export const GUIDE_STORAGE_KEYS: Record<GuideId, string> = {
  matchups: "gamelens.guide.matchups.v1",
  // Unchanged existing game-detail guide key.
  "game-detail": "hasSeenMatchupSectionSpotlightTour",
  "matchup-lab": "gamelens.guide.matchup-lab.v1",
};

/** Which guide, if any, belongs to a route. Unlisted routes have no guide. */
export function guideIdForPath(pathname: string): GuideId | null {
  if (pathname === "/") return "matchups";
  if (pathname === "/matchup-lens") return "matchup-lab";
  if (/^\/matchup\/[^/]+$/.test(pathname)) return "game-detail";
  return null;
}

export function openGuide(id: GuideId) {
  window.dispatchEvent(new CustomEvent(GUIDE_EVENT, { detail: { guide: id } }));
}

function hasSeen(id: GuideId): boolean {
  try {
    return localStorage.getItem(GUIDE_STORAGE_KEYS[id]) === "true";
  } catch {
    return true;
  }
}

function markSeen(id: GuideId) {
  try {
    localStorage.setItem(GUIDE_STORAGE_KEYS[id], "true");
  } catch {
    /* ignore */
  }
}

interface GuideController {
  open: boolean;
  opening: "automatic" | "manual" | null;
  /** Close and remember, used by Finish, Skip, Close and Escape alike. */
  dismiss: () => void;
}

/**
 * Auto-opens a guide once per browser for its versioned key, and re-opens it
 * whenever Help targets this exact guide — even after completion.
 */
export function useGuide(id: GuideId, autoOpen = true): GuideController {
  const [open, setOpen] = useState(false);
  const [opening, setOpening] = useState<"automatic" | "manual" | null>(null);
  const autoOpenedRef = useRef(false);

  useEffect(() => {
    if (!autoOpen || autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    if (!hasSeen(id)) {
      setOpening("automatic");
      setOpen(true);
    }
  }, [id, autoOpen]);

  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<{ guide?: GuideId }>).detail;
      if (detail?.guide === id) {
        setOpening("manual");
        setOpen(true);
      }
    };
    window.addEventListener(GUIDE_EVENT, onOpen);
    return () => window.removeEventListener(GUIDE_EVENT, onOpen);
  }, [id]);

  const dismiss = useCallback(() => {
    markSeen(id);
    setOpen(false);
    setOpening(null);
  }, [id]);

  return { open, opening, dismiss };
}
