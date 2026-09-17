// Shared harness for page-level Matchup Lens tests.
//
// The production page is live-only: it always loads evidence from the
// authenticated `matchup_lens_v1` endpoint. Tests therefore stub `fetch` with a
// contract-shaped payload instead of relying on any static snapshot.

import { vi } from "vitest";
import { makeLensV1Payload, type FixtureOptions } from "./matchup-lens-v1-fixture";

export const LIVE_GAME_ID = "20260917_LAR@CLE";

/** Adds the live `game` parameter to a test entry URL when it has none. */
export function withGame(entry: string, gameId: string = LIVE_GAME_ID): string {
  if (entry.includes("game=")) return entry;
  const separator = entry.includes("?") ? "&" : "?";
  return `${entry}${separator}game=${encodeURIComponent(gameId)}`;
}

export interface LensFetchMockOptions extends FixtureOptions {
  /** Non-2xx status to return instead of a payload. */
  status?: number;
  /** Reject the request, simulating a network failure. */
  networkError?: boolean;
  /** Return this body verbatim (used for contract-violation cases). */
  body?: unknown;
}

export interface LensFetchMock {
  /** Number of endpoint requests made. */
  calls: () => string[];
  restore: () => void;
}

/** Installs a `fetch` stub for the lens-context endpoint. */
export function installLensFetchMock(options: LensFetchMockOptions = {}): LensFetchMock {
  const urls: string[] = [];
  const stub = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : input.toString();
    urls.push(url);
    if (options.networkError) throw new TypeError("Failed to fetch");
    const status = options.status ?? 200;
    const body = options.body ?? makeLensV1Payload(options);
    return new Response(JSON.stringify(status === 200 ? body : { detail: "error" }), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  });
  vi.stubGlobal("fetch", stub);
  return {
    calls: () => urls,
    restore: () => vi.unstubAllGlobals(),
  };
}
