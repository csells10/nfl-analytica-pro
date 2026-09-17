import { AlertTriangle } from "lucide-react";
import type { MatchupLensLensReadiness } from "@/lib/matchup-lens-adapter";

/**
 * Side-specific evidence disclosure for one lens. Readiness comes from the
 * backend and never changes a Lens Score: a missing metric stays out of both
 * the numerator and the denominator, it is never counted as zero.
 */
export function LensReadinessNote({
  readiness,
  labelA,
  labelB,
}: {
  readiness: MatchupLensLensReadiness | undefined;
  labelA: string;
  labelB: string;
}) {
  if (!readiness || readiness.status === "complete") return null;

  const sides = [
    { label: labelA, side: readiness.away },
    { label: labelB, side: readiness.home },
  ].filter((entry) => entry.side && entry.side.status !== "complete");

  const detail = sides
    .map((entry) => {
      const missing = entry.side?.missingMetrics ?? [];
      return missing.length > 0
        ? `${entry.label}: missing ${missing.join(", ")}`
        : `${entry.label}: incomplete evidence`;
    })
    .join(" · ");

  return (
    <span
      data-testid="lens-readiness-note"
      data-lens-readiness={readiness.status}
      className="mt-1.5 flex items-start gap-1 text-[11px] leading-relaxed text-muted-foreground"
    >
      <AlertTriangle className="mt-[2px] h-3 w-3 shrink-0" aria-hidden="true" />
      <span>
        {readiness.status === "unavailable"
          ? "No comparison for this lens: the evidence behind it is unavailable."
          : `Uneven evidence — the score uses only the values present. ${detail || "One side is missing evidence."}`}
      </span>
    </span>
  );
}
