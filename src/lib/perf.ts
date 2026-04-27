// Lightweight perf logger — always on so logs are visible in published/preview builds too.
// Use to measure auth restore, query cache restore, route mounts, first data paint, API timings.

export function perfMark(label: string): void {
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label} @ ${Math.round(performance.now())}ms`);
}

export function perfTime(label: string, startMs: number): void {
  const dur = Math.round(performance.now() - startMs);
  // eslint-disable-next-line no-console
  console.log(`[perf] ${label}: ${dur}ms`);
}

export function perfNow(): number {
  return performance.now();
}
