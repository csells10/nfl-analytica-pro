import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getRunVisibility,
  toApiParams,
  type RunVisibilityFilters,
  type RunVisibilityResponse,
} from "@/lib/run-visibility";

/**
 * Overview payload: compact game rows, weeks, attention and recent runs.
 */
export function useRunVisibility(filters: RunVisibilityFilters) {
  return useQuery<RunVisibilityResponse>({
    queryKey: ["run-visibility", toApiParams({ ...filters, gameId: undefined })],
    queryFn: () => getRunVisibility({ ...filters, gameId: undefined }),
    placeholderData: keepPreviousData,
  });
}

/**
 * Detail payload: the same endpoint requested with a game_id, which is the only
 * way full stage evidence is returned.
 */
export function useRunVisibilityGame(filters: RunVisibilityFilters, gameId: string | null) {
  return useQuery<RunVisibilityResponse>({
    queryKey: ["run-visibility", "game", gameId, filters.learningRunId, filters.season],
    queryFn: () => getRunVisibility({ ...filters, gameId: gameId ?? undefined }),
    enabled: Boolean(gameId),
  });
}
