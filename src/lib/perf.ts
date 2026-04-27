// Lightweight perf logger — active only in dev builds.
// Use to measure auth restore, query cache restore, route mounts, first data paint, API timings.

const enabled = import.meta.env.DEV;

export function perfMark(label: string): void {
  if (!enabled) return;
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label} @ ${Math.round(performance.now())}ms`);
}

export function perfTime(label: string, startMs: number): void {
  if (!enabled) return;
  const dur = Math.round(performance.now() - startMs);
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}: ${dur}ms`);
}

export function perfNow(): number {
  return performance.now();
}
