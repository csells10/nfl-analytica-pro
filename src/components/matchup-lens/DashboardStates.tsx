import { AlertTriangle, RefreshCcw, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Loading keeps the page shape so nothing jumps when data arrives.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-3" data-testid="dashboard-skeleton" aria-busy="true">
      <p className="sr-only" role="status">
        Loading matchup data
      </p>
      <Card className="border-border bg-card">
        <CardContent className="p-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
            <div className="h-11 w-full animate-pulse rounded-md bg-muted/50 sm:w-56" />
            <div className="h-11 w-full animate-pulse rounded-md bg-muted/50 sm:w-56" />
          </div>
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 p-4">
          <div className="h-3 w-24 animate-pulse rounded bg-muted/50" />
          <div className="h-4 w-3/4 animate-pulse rounded bg-muted/50" />
          <div className="h-3 w-1/2 animate-pulse rounded bg-muted/50" />
          <div className="h-9 w-40 animate-pulse rounded-md bg-muted/50" />
        </CardContent>
      </Card>
      <Card className="border-border bg-card">
        <CardContent className="space-y-2 p-4">
          <div className="h-3 w-28 animate-pulse rounded bg-muted/50" />
          {[0, 1, 2].map((row) => (
            <div key={row} className="h-4 w-full animate-pulse rounded bg-muted/40" />
          ))}
        </CardContent>
      </Card>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="h-28 animate-pulse rounded-lg border border-border bg-muted/30" />
        ))}
      </div>
    </div>
  );
}

interface DashboardErrorProps {
  onRetry: () => void;
}

/**
 * Failure states stay plain-language and stable. Raw error text is never shown,
 * so backend or transport detail cannot leak into the page.
 */
export const DASHBOARD_ERROR_MESSAGE =
  "The matchup data couldn’t be loaded right now. Nothing was lost — try again to load this matchup.";

export function DashboardError({ onRetry }: DashboardErrorProps) {
  return (
    <Card className="border-destructive/40 bg-card" data-testid="dashboard-error">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">Matchup data didn’t load</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {DASHBOARD_ERROR_MESSAGE}
            </p>

            <button
              type="button"
              data-testid="dashboard-retry"
              onClick={onRetry}
              className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[36px]"
            >
              <RefreshCcw className="h-3.5 w-3.5" aria-hidden="true" />
              Try again
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface DashboardEmptyProps {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Empty is not an error: explain the gap and offer the nearest useful move. */
export function DashboardEmpty({ title, message, actionLabel, onAction }: DashboardEmptyProps) {
  return (
    <Card className="border-border bg-card" data-testid="dashboard-empty">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
            {actionLabel && onAction && (
              <button
                type="button"
                data-testid="dashboard-empty-action"
                onClick={onAction}
                className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-[36px]"
              >
                {actionLabel}
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
