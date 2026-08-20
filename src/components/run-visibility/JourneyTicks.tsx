import { cn } from "@/lib/utils";
import type { StateCell } from "@/lib/run-visibility";

const TICKS: Array<{ key: keyof Pick<TickSource, "daily_data_load" | "gamelens_pregame" | "postgame_learning">; label: string }> = [
  { key: "daily_data_load", label: "Load" },
  { key: "gamelens_pregame", label: "Pregame" },
  { key: "postgame_learning", label: "Postgame" },
];

interface TickSource {
  daily_data_load: StateCell;
  gamelens_pregame: StateCell;
  postgame_learning: StateCell;
}

/** Quiet by design: only attention states carry colour at the collapsed level. */
function dotTone(cell: StateCell): string {
  if (cell.attention === "action_required" || cell.status === "failed") return "bg-[hsl(var(--destructive))]";
  if (cell.attention === "known_gap") return "bg-[hsl(var(--level-elevated))]";
  if (cell.status === "waiting") return "bg-muted-foreground/70";
  if (cell.status === "not_applicable") return "bg-muted-foreground/30";
  return "bg-muted-foreground/50";
}

function tickText(cell: StateCell): string {
  if (cell.attention === "action_required") return "needs attention";
  if (cell.attention === "known_gap") return "known gap";
  if (cell.status === "failed") return "failed";
  if (cell.status === "waiting") return "waiting";
  if (cell.status === "not_applicable") return "n/a";
  if (cell.status === "no_work_needed") return "no work";
  return "complete";
}

/**
 * Compact three-part journey for a collapsed game row: Daily Data Load,
 * GameLens Pregame, Postgame Learning.
 */
export default function JourneyTicks({ game, className }: { game: TickSource; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1", className)}>
      {TICKS.map(({ key, label }) => {
        const cell = game[key];
        return (
          <span key={key} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className={cn("h-1.5 w-1.5 rounded-full", dotTone(cell))} aria-hidden />
            <span className="font-medium text-foreground/70">{label}</span>
            <span>{tickText(cell)}</span>
          </span>
        );
      })}
    </div>
  );
}
