import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "qa@gamelens.io" }, signOut: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({ useMe: () => ({ data: { is_admin: false } }) }));
vi.mock("@/lib/firebase", () => ({
  getAuthToken: async () => "test-token",
  firebaseAuth: {},
}));

import MatchupLens from "@/pages/MatchupLens";
import { installLensFetchMock, withGame, type LensFetchMock } from "./matchup-lens-live-harness";

let fetchMock: LensFetchMock | null = null;

function renderPage(entry = withGame("/matchup-lens")) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[entry]}>
        <MatchupLens />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  fetchMock?.restore();
  fetchMock = null;
  vi.unstubAllGlobals();
});

describe("Matchup Lens live evidence", () => {
  it("requests the lens-context endpoint for the game in the URL", async () => {
    fetchMock = installLensFetchMock();
    renderPage();
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    const [url] = fetchMock.calls();
    expect(url).toContain("/game/20260917_LAR%40CLE/lens-context");
  });

  it("shows a Slate-directed empty state and makes no request without a game", async () => {
    fetchMock = installLensFetchMock();
    renderPage("/matchup-lens");
    await screen.findByText("Choose a matchup first");
    expect(fetchMock.calls()).toHaveLength(0);
  });

  it("shows a controlled invalid state for a malformed game id", async () => {
    fetchMock = installLensFetchMock();
    renderPage("/matchup-lens?game=not-a-game");
    await screen.findByText("That matchup link isn't valid");
    expect(fetchMock.calls()).toHaveLength(0);
  });

  it("never shows preseason baseline evidence while loading", async () => {
    let release: (() => void) | null = null;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        await gate;
        return new Response(JSON.stringify(makeLensV1Payload()), { status: 200 });
      }),
    );

    renderPage();
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
    expect(screen.queryByText(/2026-08-23/)).toBeNull();
    release?.();
  });

  it("takes canonical teams from the payload, not from the URL", async () => {
    fetchMock = installLensFetchMock();
    renderPage(withGame("/matchup-lens?a=ZZZ&b=YYY"));
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    const label = screen.getByTestId("lens-context-label").textContent ?? "";
    expect(label).toContain("LAR");
    expect(label).toContain("CLE");
    expect(label).not.toContain("ZZZ");
  });

  it("hides league standings and 'out of' text when league context is suppressed", async () => {
    fetchMock = installLensFetchMock();
    renderPage(withGame("/matchup-lens?view=lenses"));
    await waitFor(() => expect(screen.getByTestId("lens-explorer")).toBeTruthy());

    expect(document.body.textContent).not.toMatch(/of 32/);
    expect(document.body.textContent).not.toMatch(/\bUnranked\b/);
  });

  it("keeps scores, cards and navigation while league context is suppressed", async () => {
    fetchMock = installLensFetchMock();
    renderPage(withGame("/matchup-lens?view=lenses"));
    const explorer = await screen.findByTestId("lens-explorer");

    expect(explorer.textContent).toMatch(/\d/);
    expect(screen.getByTestId("matchup-context-bar")).toBeTruthy();
  });

  it("discloses partial evidence without dropping the lens score", async () => {
    fetchMock = installLensFetchMock({ awayMissing: ["yards_per_play"] });
    renderPage(withGame("/matchup-lens?view=lenses"));
    await screen.findByTestId("lens-explorer");

    expect(document.body.textContent).toMatch(/Evidence is uneven/);
    expect(document.body.textContent).not.toMatch(/counted as zero/i);
  });

  it("offers a retry for a server failure and recovers on retry", async () => {
    const user = userEvent.setup();
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    let attempt = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        attempt += 1;
        if (attempt === 1) return new Response("{}", { status: 500 });
        return new Response(JSON.stringify(makeLensV1Payload()), { status: 200 });
      }),
    );

    renderPage();
    const retry = await screen.findByRole("button", { name: /retry/i });
    await user.click(retry);
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
  });

  it("shows a plain-language message for access denied with no retry", async () => {
    fetchMock = installLensFetchMock({ status: 403 });
    renderPage();
    await screen.findByText("You don't have access to this matchup");
    expect(screen.queryByRole("button", { name: /retry/i })).toBeNull();
  });

  it("shows a controlled unavailable state and never falls back to baseline data", async () => {
    fetchMock = installLensFetchMock({
      body: {
        schema_version: "matchup_lens_v1",
        available: false,
        reason: "Evidence is not ready for this matchup yet.",
        game: null,
        display: null,
        basis: null,
        metric_catalog: null,
        away: null,
        home: null,
        coverage: null,
        warnings: null,
        league_context: null,
        method: null,
      },
    });
    renderPage();
    await screen.findByText("Evidence is not ready for this matchup yet.");
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
  });

  it("shows a controlled state for a contract-invalid response", async () => {
    fetchMock = installLensFetchMock({ body: { schema_version: "matchup_lens_v9" } });
    renderPage();
    await screen.findByText("This matchup's evidence couldn't be read");
  });

  it("clears the previous game's evidence immediately when the game changes", async () => {
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    const first = makeLensV1Payload({ awayAbv: "LAR", homeAbv: "CLE" });
    const second = makeLensV1Payload({ awayAbv: "BUF", homeAbv: "DET" });
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = typeof input === "string" ? input : input.toString();
        const body = url.includes("BUF") ? second : first;
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );

    const { unmount } = renderPage();
    await waitFor(() =>
      expect(screen.getByTestId("lens-context-label").textContent).toContain("LAR"),
    );
    unmount();

    renderPage(withGame("/matchup-lens", "20260917_BUF@DET"));
    await waitFor(() =>
      expect(screen.getByTestId("lens-context-label").textContent).toContain("BUF"),
    );
    expect(screen.getByTestId("lens-context-label").textContent).not.toContain("LAR");
  });
});
