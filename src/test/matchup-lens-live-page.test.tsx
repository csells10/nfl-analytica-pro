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
    await screen.findByText("That matchup link isn’t valid");
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

  it("offers a retry for a server failure and retries only the current game", async () => {
    const user = userEvent.setup();
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    const urls: string[] = [];
    let attempt = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(typeof input === "string" ? input : input.toString());
        attempt += 1;
        // The hook retries a server failure once on its own before giving up.
        if (attempt <= 2) return new Response("{}", { status: 500 });
        return new Response(JSON.stringify(makeLensV1Payload()), { status: 200 });
      }),
    );

    renderPage();
    const retry = await screen.findByRole("button", { name: /try again/i }, { timeout: 5000 });
    await user.click(retry);
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());
    // Every request — original and retry — targets the same game.
    expect(urls.length).toBeGreaterThan(1);
    for (const url of urls) expect(url).toContain("/game/20260917_LAR%40CLE/lens-context");
  });

  it("shows a plain-language message for access denied with no retry", async () => {
    fetchMock = installLensFetchMock({ status: 403 });
    renderPage();
    await screen.findByText("You don’t have access to this matchup");
    expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
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
        teams: null,
        coverage: null,
        league_context: null,
        method: null,
      },
    });
    renderPage();
    await screen.findByText("Evidence is not ready for this matchup yet.");
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
  });

  it("shows a controlled state for a contract-invalid response and scores nothing", async () => {
    fetchMock = installLensFetchMock({ body: { schema_version: "matchup_lens_v9" } });
    renderPage();
    await screen.findByText("This matchup’s evidence couldn’t be read");
    expect(screen.queryByTestId("lens-explorer")).toBeNull();
    expect(screen.queryByTestId("insight-ticker")).toBeNull();
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

/** Envelope returned for HTTP 200 with `available: false`. */
const UNAVAILABLE_BODY = {
  schema_version: "matchup_lens_v1",
  available: false,
  reason: "Evidence is not ready for this matchup yet.",
  game: null,
  display: null,
  basis: null,
  metric_catalog: null,
  teams: null,
  coverage: null,
  league_context: null,
  method: null,
};

describe("Matchup Lens unavailable manual retry", () => {
  it("offers an inline retry that reloads only the current game, with no automatic retry", async () => {
    const user = userEvent.setup();
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    const urls: string[] = [];
    let attempt = 0;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        urls.push(typeof input === "string" ? input : input.toString());
        attempt += 1;
        const body = attempt === 1 ? UNAVAILABLE_BODY : makeLensV1Payload();
        return new Response(JSON.stringify(body), { status: 200 });
      }),
    );

    renderPage();
    await screen.findByText("Evidence is not ready for this matchup yet.");

    // No scored content, no baseline evidence and no automatic second request.
    expect(screen.queryByTestId("insight-ticker")).toBeNull();
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
    expect(urls).toHaveLength(1);

    // The Slate route stays available alongside the retry.
    expect(screen.getByTestId("dashboard-empty-action")).toBeTruthy();

    await user.click(screen.getByTestId("dashboard-empty-retry"));
    await waitFor(() => expect(screen.getByTestId("insight-ticker")).toBeTruthy());

    expect(urls.length).toBeGreaterThan(1);
    for (const url of urls) expect(url).toContain("/game/20260917_LAR%40CLE/lens-context");
  });
});

describe("Matchup Lens backend warnings", () => {
  async function renderWithWarnings(
    warnings: Array<{ code: string; message: string }>,
    options: { awayMissing?: string[]; leagueMode?: "suppressed" | "available" } = {},
  ) {
    const { makeLensV1Payload } = await import("./matchup-lens-v1-fixture");
    const payload = makeLensV1Payload(options);
    payload.coverage!.warnings = warnings.map((warning) => ({
      ...warning,
      lens_key: null,
      team_side: null,
      metrics: [],
    }));
    fetchMock = installLensFetchMock({ body: payload });
    renderPage();
    return await screen.findByTestId("context-notices");
  }

  function occurrences(text: string, needle: string): number {
    return text.split(needle).length - 1;
  }

  it("does not repeat a partial-evidence warning already shown by readiness", async () => {
    const notices = await renderWithWarnings(
      [{ code: "PARTIAL_LENS_EVIDENCE", message: "Some lens evidence is partial." }],
      { awayMissing: ["yards_per_play"] },
    );
    expect(notices.textContent).toMatch(/Evidence is uneven/);
    expect(notices.textContent).not.toContain("Some lens evidence is partial.");
    expect(occurrences(notices.textContent ?? "", "Evidence is uneven")).toBe(1);
  });

  it("does not repeat an asymmetric-evidence warning already shown by readiness", async () => {
    const notices = await renderWithWarnings(
      [{ code: "ASYMMETRIC_LENS_EVIDENCE", message: "One team is missing evidence." }],
      { awayMissing: ["yards_per_play"] },
    );
    expect(notices.textContent).toMatch(/Evidence is uneven/);
    expect(notices.textContent).not.toContain("One team is missing evidence.");
  });

  it("does not repeat a league-suppression warning already shown by the suppression notice", async () => {
    const notices = await renderWithWarnings([
      { code: "LEAGUE_RANK_SUPPRESSED", message: "League ranks are suppressed." },
    ]);
    expect(notices.textContent).toMatch(/League rankings are hidden/);
    expect(notices.textContent).not.toContain("League ranks are suppressed.");
  });

  it("shows a safe backend warning that no existing disclosure represents", async () => {
    const notices = await renderWithWarnings([
      { code: "SOURCE_DATA_LAG", message: "Source data is one day behind." },
    ]);
    expect(notices.textContent).toContain("Source data is one day behind.");
  });

  it("keeps scoring intact while warnings are displayed", async () => {
    await renderWithWarnings([
      { code: "SOURCE_DATA_LAG", message: "Source data is one day behind." },
    ]);
    expect(screen.getByTestId("insight-ticker")).toBeTruthy();
  });
});

describe("Matchup Lens HTTP state coverage", () => {
  const cases: Array<{ status: number; text: RegExp; retryable: boolean }> = [
    { status: 400, text: /That matchup link isn’t valid/, retryable: false },
    { status: 404, text: /We don’t have this game/, retryable: false },
    { status: 409, text: /This game’s evidence can’t be used/, retryable: false },
    { status: 403, text: /You don’t have access to this matchup/, retryable: false },
  ];

  for (const testCase of cases) {
    it(`shows a safe state with no automatic retry for HTTP ${testCase.status}`, async () => {
      fetchMock = installLensFetchMock({ status: testCase.status });
      renderPage();
      await screen.findByText(testCase.text);
      expect(fetchMock.calls()).toHaveLength(1);
      expect(screen.queryByRole("button", { name: /try again/i })).toBeNull();
      expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
      expect(document.body.textContent).not.toContain("detail");
    });
  }

  it("signs the user out on HTTP 401 so the protected route returns to sign-in", async () => {
    const { firebaseAuth } = await import("@/lib/firebase");
    const { signOut } = await import("firebase/auth");
    fetchMock = installLensFetchMock({ status: 401 });
    renderPage();
    await waitFor(() => expect(signOut).toHaveBeenCalledWith(firebaseAuth));
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
  });

  it("retries a 504 once automatically and then offers manual retry", async () => {
    fetchMock = installLensFetchMock({ status: 504 });
    renderPage();
    await screen.findByText("This matchup took too long to load", undefined, { timeout: 5000 });
    // One original request plus at most one automatic retry.
    expect(fetchMock.calls()).toHaveLength(2);
    expect(screen.getByTestId("dashboard-retry")).toBeTruthy();
  });

  it("retries a network failure once and then stops, showing a safe failure", async () => {
    fetchMock = installLensFetchMock({ networkError: true });
    renderPage();
    await screen.findByText(/couldn’t be loaded right now/, undefined, { timeout: 5000 });
    expect(fetchMock.calls()).toHaveLength(2);
    expect(screen.queryByText(/Preseason-to-date/)).toBeNull();
  });

  it("does not retry a 500 more than once automatically", async () => {
    fetchMock = installLensFetchMock({ status: 500 });
    renderPage();
    await screen.findByRole("button", { name: /try again/i }, { timeout: 5000 });
    expect(fetchMock.calls()).toHaveLength(2);
  });
});
