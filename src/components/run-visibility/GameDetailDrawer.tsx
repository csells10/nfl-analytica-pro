import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import StatusChip from "./StatusChip";
import StageTimeline from "./StageTimeline";
import type { GameDetail } from "@/lib/run-visibility";

function HeaderField({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 space-y-0.5">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="break-all text-xs text-foreground">{value}</p>
    </div>
  );
}

interface Props {
  gameId: string | null;
  game: GameDetail | null;
  isLoading: boolean;
  onClose: () => void;
}

export default function GameDetailDrawer({ gameId, game, isLoading, onClose }: Props) {
  return (
    <Sheet open={Boolean(gameId)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-xl"
      >
        <SheetHeader className="space-y-3 border-b border-border p-4 text-left">
          <div>
            <SheetTitle className="text-base">{game?.matchup ?? "Game details"}</SheetTitle>
            <SheetDescription className="font-mono text-xs">{gameId}</SheetDescription>
          </div>
          {game && (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip {...game.overall} />
                <span className="text-xs text-muted-foreground">{game.game_status}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <HeaderField label="Week" value={game.week_label} />
                <HeaderField label="Scheduled kickoff" value={game.kickoff_label} />
                <HeaderField label="Capture ID" value={game.capture_id ?? "Not available"} />
                <HeaderField label="Learning run ID" value={game.learning_run_id} />
              </div>
            </>
          )}
        </SheetHeader>

        <div className="space-y-3 p-4">
          {isLoading && !game && (
            <>
              <Skeleton className="h-40 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-36 w-full" />
            </>
          )}
          {game?.clocks.map((clock) => (
            <StageTimeline key={clock.key} clock={clock} />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
