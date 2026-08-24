// Transport-agnostic shape for the Matchup Lens data layer.
//
// The demo is fed by a static snapshot module, but nothing downstream depends
// on that: a future Game API response only has to satisfy `LensSnapshot`.

export type SignalStrength = "strong" | "supporting";

export interface MetricDefinition {
  metric: string;
  label: string;
  signalStrength: SignalStrength;
  lensTags: string[];
}

export interface TeamMetricRow {
  teamId: number;
  teamAbv: string;
  gamesInWindow: number;
  latestSourceDate: string;
  dataLagDays: number;
  /** metric key -> league percentile (0-100) */
  percentiles: Record<string, number>;
}

export interface LensSnapshot {
  asOfDate: string;
  windowLabel: string;
  gamesLabel: string;
  contextLabel: string;
  metrics: MetricDefinition[];
  teams: TeamMetricRow[];
}
