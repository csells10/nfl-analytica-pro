import { ArrowRight, Layers, Radar, Swords, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type DestinationId = "constellation" | "biggest-edge" | "collision" | "lenses";

export interface Destination {
  id: DestinationId;
  title: string;
  helper: string;
  icon: LucideIcon;
  disabled?: boolean;
}

interface DestinationCardsProps {
  destinations: Destination[];
  activeId: DestinationId | null;
  onOpen: (id: DestinationId) => void;
}

export const DESTINATION_ICONS: Record<DestinationId, LucideIcon> = {
  constellation: Radar,
  "biggest-edge": TrendingUp,
  collision: Swords,
  lenses: Layers,
};

/**
 * Navigation, not mini dashboards. Each card states where it goes, what the
 * user will see there, and carries an explicit "Open" control.
 */
export function DestinationCards({ destinations, activeId, onOpen }: DestinationCardsProps) {
  return (
    <section aria-label="Choose what to explore" data-testid="destination-cards">
      <h2 className="text-sm font-semibold tracking-tight text-foreground">
        Choose what to explore
      </h2>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {destinations.map((destination) => {
          const Icon = destination.icon;
          const isActive = destination.id === activeId;
          return (
            <div
              key={destination.id}
              data-destination={destination.id}
              data-active={isActive ? "true" : "false"}
              className={`flex min-w-0 flex-col rounded-lg border bg-card p-3 transition-colors ${
                isActive
                  ? "border-primary/60 bg-secondary"
                  : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-start gap-2">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${isActive ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs font-semibold leading-snug text-foreground">
                    {destination.title}
                  </p>
                  <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                    {destination.helper}
                  </p>
                </div>
              </div>
              <button
                type="button"
                data-testid={`destination-open-${destination.id}`}
                disabled={destination.disabled}
                onClick={() => onOpen(destination.id)}
                className="mt-2.5 inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 self-start rounded-md border border-border px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-[36px]"
              >
                Open
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
