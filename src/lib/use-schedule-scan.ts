import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { addDays, format } from "date-fns";
import { fetchNflSchedule, type NflGame } from "@/lib/nfl-api";

export const SCAN_WINDOW_DAYS = 7;

export interface ScheduleScanResult {
  /** True while any of the seven requests is still in flight. */
  isResolving: boolean;
  /** Dates (yyyy-MM-dd) that loaded successfully and contain games. */
  datesWithGames: string[];
  /** True if at least one of the seven requests failed. */
  hasFailures: boolean;
  /** True when all seven requests succeeded. */
  allSucceeded: boolean;
}

/** The scan window: the start date plus the following six calendar days. */
export function scanWindow(start: Date): string[] {
  return Array.from({ length: SCAN_WINDOW_DAYS }, (_, i) => format(addDays(start, i), "yyyy-MM-dd"));
}

/**
 * Loads the seven-day window in parallel, reusing the existing
 * `["nfl-schedule", date]` query key and cached results. Failed dates are
 * never treated as empty — they are reported separately.
 */
export function useScheduleScan(start: Date | undefined, enabled = true): ScheduleScanResult {
  const dates = useMemo(() => (start ? scanWindow(start) : []), [start]);

  const queries = useQueries({
    queries: dates.map((dateStr) => ({
      queryKey: ["nfl-schedule", dateStr],
      queryFn: () => fetchNflSchedule(dateStr),
      enabled: enabled && !!dateStr,
      staleTime: 5 * 60 * 1000,
      retry: 2,
    })),
  });

  return useMemo(() => {
    if (!enabled || dates.length === 0) {
      return { isResolving: false, datesWithGames: [], hasFailures: false, allSucceeded: false };
    }
    const isResolving = queries.some((q) => q.isLoading);
    const datesWithGames = dates.filter((dateStr, i) => {
      const data = queries[i]?.data as NflGame[] | undefined;
      return queries[i]?.isSuccess && Array.isArray(data) && data.length > 0;
    });
    const hasFailures = queries.some((q) => q.isError);
    const allSucceeded = queries.every((q) => q.isSuccess);
    return { isResolving, datesWithGames, hasFailures, allSucceeded };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, dates, queries.map((q) => `${q.status}:${(q.data as NflGame[] | undefined)?.length ?? ""}`).join("|")]);
}
