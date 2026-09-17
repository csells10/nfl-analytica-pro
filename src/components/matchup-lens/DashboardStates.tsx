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
  /** Optional plain-language override. Never raw error text. */
  title?: string;
  message?: string;
}

/**
 * Safe, plain-language copy for every live lens-context state. No raw server
 * body, status text, stack trace or internal detail ever reaches the UI.
 */
export const LENS_STATE_COPY = {
  noGame: {
    title: "Choose a matchup first",
    message:
      "Matchup Lens opens from a specific game. Pick a matchup on the Slate to load its evidence.",
    action: "Go to the Slate",
  },
  malformedGame: {
    title: "That matchup link isn’t valid",
    message:
      "The game in this link isn’t in a form we recognise, so no evidence was requested. Pick a matchup on the Slate to continue.",
    action: "Go to the Slate",
  },
  unknownGame: {
    title: "We don’t have this game",
    message:
      "No lens evidence exists for this game. Pick another matchup on the Slate to continue.",
    action: "Go to the Slate",
  },
  unavailable: {
    title: "Lens evidence isn’t ready for this game",
    message: "Nothing is calculated until the evidence is complete enough to compare.",
    action: "Go to the Slate",
  },
  accessDenied: {
    title: "You don’t have access to this matchup",
    message: "This account isn’t authorised to see GameLens evidence for this game.",
  },
  conflict: {
    title: "This game’s evidence can’t be used",
    message:
      "The evidence behind this matchup didn’t pass its safety checks, so nothing is scored. Try another matchup on the Slate.",
    action: "Go to the Slate",
  },
  invalidResponse: {
    title: "This matchup’s evidence couldn’t be read",
    message:
      "Nothing is shown rather than a partial comparison. Try again in a moment, or pick another matchup.",
  },
  timeout: {
    title: "This matchup took too long to load",
    message: "The evidence service didn’t answer in time. Try again to load this matchup.",
  },
} as const;

/**
 * Failure states stay plain-language and stable. Raw error text is never shown,
 * so backend or transport detail cannot leak into the page.
 */
export const DASHBOARD_ERROR_MESSAGE =
  "The matchup data couldn’t be loaded right now. Nothing was lost — try again to load this matchup.";

export function DashboardError({ onRetry, title, message }: DashboardErrorProps) {
  return (
    <Card className="border-destructive/40 bg-card" data-testid="dashboard-error">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              {title ?? "Matchup data didn’t load"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {message ?? DASHBOARD_ERROR_MESSAGE}
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
