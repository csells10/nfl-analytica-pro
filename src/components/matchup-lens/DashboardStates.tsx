import { AlertTriangle, RefreshCcw, SearchX } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { getKnownTeam, teamLogoUrl } from "@/lib/nfl-teams";

interface MatchupLabLoadingProps {
  awayAbbr: string;
  homeAbbr: string;
}

/**
 * URL identity is temporary presentation context only. An explicit registry
 * lookup prevents unknown abbreviations from becoming guessed team identity.
 */
export function MatchupLabLoading({ awayAbbr, homeAbbr }: MatchupLabLoadingProps) {
  const away = getKnownTeam(awayAbbr);
  const home = getKnownTeam(homeAbbr);

  if (!away || !home) {
    return (
      <div
        className="flex min-h-[50vh] animate-matchup-reveal items-center justify-center motion-reduce:animate-none"
        data-testid="matchup-lab-loading"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <p className="text-sm text-muted-foreground">Loading matchup evidence…</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-[50vh] animate-matchup-reveal items-center justify-center motion-reduce:animate-none"
      data-testid="matchup-lab-loading"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="w-full max-w-2xl text-center">
        <div className="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 sm:gap-8">
          <div className="flex min-w-0 flex-col items-center gap-3">
            <img
              src={teamLogoUrl(away.abbr, 500)}
              alt={`${away.fullName} logo`}
              className="h-16 w-16 object-contain sm:h-24 sm:w-24"
            />
            <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
              {away.fullName}
            </p>
          </div>
          <span className="font-mono text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            at
          </span>
          <div className="flex min-w-0 flex-col items-center gap-3">
            <img
              src={teamLogoUrl(home.abbr, 500)}
              alt={`${home.fullName} logo`}
              className="h-16 w-16 object-contain sm:h-24 sm:w-24"
            />
            <p className="text-sm font-semibold leading-snug text-foreground sm:text-base">
              {home.fullName}
            </p>
          </div>
        </div>
        <h1 className="mt-10 text-xl font-bold text-foreground sm:text-2xl">Preparing Matchup Lab</h1>
        <p className="mt-2 text-sm text-muted-foreground">Loading live evidence for this game…</p>
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
    title: "Choose a game to open Matchup Lab",
    message:
      "Matchup Lab opens from a specific game. Pick a matchup to load its evidence.",
    action: "View Matchups",
  },
  malformedGame: {
    title: "That matchup link isn’t valid",
    message:
      "The game in this link isn’t in a form we recognise, so no evidence was requested. Pick another matchup to continue.",
    action: "View Matchups",
  },
  unknownGame: {
    title: "We don’t have this game",
    message:
      "No lens evidence exists for this game. Pick another matchup to continue.",
    action: "View Matchups",
  },
  unavailable: {
    title: "Matchup Lab isn’t ready for this game yet",
    message: "Nothing is calculated until the evidence is complete enough to compare.",
    action: "View Matchups",
  },
  accessDenied: {
    title: "You don’t have access to this matchup",
    message: "This account isn’t authorised to see GameLens evidence for this game.",
  },
  conflict: {
    title: "This game’s evidence can’t be used",
    message:
      "The evidence behind this matchup didn’t pass its safety checks, so nothing is scored. Try another matchup.",
    action: "View Matchups",
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
              {title ?? "Matchup Lab didn’t load"}
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
  /**
   * Optional inline manual retry, used by the `available:false` state. It sits
   * alongside the navigation action: neither replaces the other.
   */
  onRetry?: () => void;
  /** True while the manual retry is in flight, so the state stays honest. */
  isRetrying?: boolean;
}

/** Empty is not an error: explain the gap and offer the nearest useful move. */
export function DashboardEmpty({
  title,
  message,
  actionLabel,
  onAction,
  onRetry,
  isRetrying = false,
}: DashboardEmptyProps) {
  return (
    <Card className="border-border bg-card" data-testid="dashboard-empty">
      <CardContent className="p-4">
        <div className="flex items-start gap-2">
          <SearchX className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{message}</p>
            <div className="flex flex-wrap items-center gap-2">
              {onRetry && (
                <button
                  type="button"
                  data-testid="dashboard-empty-retry"
                  onClick={onRetry}
                  disabled={isRetrying}
                  aria-busy={isRetrying}
                  className="mt-3 inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-default disabled:opacity-60 sm:min-h-[36px]"
                >
                  <RefreshCcw
                    className={`h-3.5 w-3.5 ${isRetrying ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  {isRetrying ? "Checking again…" : "Try again"}
                </button>
              )}
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
        </div>
      </CardContent>
    </Card>
  );
}
