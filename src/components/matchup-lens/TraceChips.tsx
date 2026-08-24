import type { TraceTarget } from "@/lib/matchup-lens-trace";
import { readableTag, scoreText, rankText } from "@/lib/matchup-lens-language";
import type { LeagueStanding } from "@/lib/matchup-lens-rank";

export interface TraceHandlers {
  onOpenTrace: (target: TraceTarget) => void;
}

/** Interactive, readable lens tag. Raw key stays visible as secondary text. */
export function TagChip({
  tag,
  excluded = false,
  onOpenTrace,
}: { tag: string; excluded?: boolean } & TraceHandlers) {
  return (
    <button
      type="button"
      data-tag={tag}
      title={`${readableTag(tag)} — open tag trace (raw key: ${tag})`}
      onClick={() => onOpenTrace({ type: "tag", id: tag })}
      className={`group inline-flex items-baseline gap-1.5 rounded border px-1.5 py-1 text-left transition-colors ${
        excluded
          ? "border-dashed border-border text-muted-foreground hover:border-muted-foreground/60"
          : "border-border bg-secondary text-secondary-foreground hover:border-foreground/40 hover:bg-secondary/70"
      }`}
    >
      <span className={`text-[11px] font-medium ${excluded ? "line-through" : ""}`}>
        {readableTag(tag)}
      </span>
      <span className="font-mono text-[9px] text-muted-foreground">{tag}</span>
    </button>
  );
}

/** Plain badge replacing "strong · w2" style jargon. */
export function RoleBadge({ label, muted = false }: { label: string; muted?: boolean }) {
  return (
    <span
      className={`whitespace-nowrap rounded px-1.5 py-0.5 text-[10px] font-medium ${
        muted
          ? "border border-dashed border-border text-muted-foreground"
          : "border border-border bg-muted/40 text-foreground"
      }`}
    >
      {label}
    </span>
  );
}

/** Lens Score with its league standing, in translated language. */
export function ScoreBlock({
  teamLabel,
  teamName,
  score,
  standing,
  tone,
}: {
  teamLabel: string;
  teamName: string;
  score: number | null;
  standing: LeagueStanding;
  tone: "a" | "b";
}) {
  return (
    <div className="rounded-md border border-border bg-muted/20 p-3">
      <p
        className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
          tone === "a" ? "text-accent-cool" : "text-primary"
        }`}
      >
        <span className="inline-flex items-center gap-1.5">
          <span
            className={`h-2 w-2 rounded-full ${tone === "a" ? "bg-accent-cool" : "bg-primary"}`}
            aria-hidden
          />
          {teamLabel}
        </span>
      </p>
      <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{teamName}</p>
      <p
        className={`mt-1 text-2xl font-semibold tabular-nums ${
          tone === "a" ? "text-accent-cool" : "text-primary"
        }`}
      >
        {scoreText(score)}
      </p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        {rankText(standing.rank, standing.total)} · {standing.tier}
      </p>
    </div>
  );
}
