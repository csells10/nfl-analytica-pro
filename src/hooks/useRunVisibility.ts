import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getRunVisibility,
  toApiParams,
  type RunVisibilityFilters,
  type RunVisibilityResponse,
} from "@/lib/run-visibility";
import { RunVisibilityError } from "@/lib/run-visibility-api";

/** Operational data: short freshness window, never persisted to storage. */
const OPERATIONAL_STALE_TIME = 45 * 1000;

/** Query metadata read by the persister in App.tsx. */
const NO_PERSIST = { persist: false } as const;

function shouldRetry(count: number, error: unknown): boolean {
  if (error instanceof RunVisibilityError) {
    const fatal = [
      "unauthenticated",
      "forbidden",
      "source_unavailable",
      "invalid_request",
      "week_not_found",
      "game_not_found",
      "range_too_large",
    ];
    if (fatal.includes(error.kind)) return false;
  }
  return count < 1;
}

/** Every request-defining field participates in the key. */
function keyFor(scope: string, filters: RunVisibilityFilters) {
  return ["run-visibility", scope, toApiParams(filters)] as const;
}

/** Range-level overview: weeks, derived days, attention and recent runs. */
export function useRunVisibility(filters: RunVisibilityFilters) {
  const scoped: RunVisibilityFilters = { ...filters, gameId: undefined };
  return useQuery<RunVisibilityResponse>({
    queryKey: keyFor("overview", scoped),
    queryFn: () => getRunVisibility(scoped),
    placeholderData: keepPreviousData,
    staleTime: OPERATIONAL_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetry,
    meta: NO_PERSIST,
  });
}

/** Narrows the same endpoint to a single operational day. */
export function useRunVisibilityDay(filters: RunVisibilityFilters, gameDate: string | undefined) {
  const scoped: RunVisibilityFilters = {
    ...filters,
    gameId: undefined,
    datePreset: "custom",
    startDate: gameDate,
    endDate: gameDate,
  };
  return useQuery<RunVisibilityResponse>({
    queryKey: keyFor("day", scoped),
    queryFn: () => getRunVisibility(scoped),
    enabled: Boolean(gameDate),
    staleTime: OPERATIONAL_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetry,
    meta: NO_PERSIST,
  });
}

/**
 * Detail payload: the same endpoint requested with a game_id, which is the only
 * way full stage evidence is returned. Runs independently of the overview.
 */
export function useRunVisibilityGame(
  filters: RunVisibilityFilters,
  gameId: string | null,
  gameDate?: string,
) {
  const scoped: RunVisibilityFilters = {
    ...filters,
    gameId: gameId ?? undefined,
    datePreset: gameDate ? "custom" : filters.datePreset,
    startDate: gameDate ?? filters.startDate,
    endDate: gameDate ?? filters.endDate,
  };
  return useQuery<RunVisibilityResponse>({
    queryKey: keyFor("game", scoped),
    queryFn: () => getRunVisibility(scoped),
    enabled: Boolean(gameId),
    staleTime: OPERATIONAL_STALE_TIME,
    gcTime: 5 * 60 * 1000,
    retry: shouldRetry,
    meta: NO_PERSIST,
  });
}
