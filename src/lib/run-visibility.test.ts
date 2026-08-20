import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LEARNING_RUN_ID,
  DEFAULT_LIMIT,
  MAX_RANGE_DAYS,
  getRunVisibility,
  normalizeRunVisibility,
  toApiParams,
  type RunVisibilityFilters,
} from "@/lib/run-visibility";
import {
  RUN_VISIBILITY_DETAIL_FIXTURE,
  RUN_VISIBILITY_FIXTURE,
} from "@/lib/run-visibility.fixture";
import {
  RUN_VISIBILITY_API_BASE,
  RunVisibilityError,
  buildRunVisibilityQuery,
} from "@/lib/run-visibility-api";
import { API_BASE } from "@/lib/nfl-api";

vi.mock("@/lib/firebase", () => ({
  getAuthToken: vi.fn(async () => "test-id-token"),
  firebaseAuth: {},
}));

const BASE_FILTERS: RunVisibilityFilters = {
  season: "2026",
  seasonType: "preseason",
  learningRunId: DEFAULT_LEARNING_RUN_ID,
  datePreset: "custom",
  startDate: "2026-08-03",
  endDate: "2026-08-20",
  limit: DEFAULT_LIMIT,
};

function mockFetch(body: unknown, init?: { status?: number }) {
  const status = init?.status ?? 200;
  const fetchMock = vi.fn(async () =>
    new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("query parameter serialization", () => {
  it("serializes every required parameter with backend casing", () => {
    const query = buildRunVisibilityQuery(toApiParams(BASE_FILTERS));
    expect(query.toString()).toBe(
      "season=2026&season_type=Preseason&learning_run_id=gamelens_2026_preseason_v1" +
        "&start_date=2026-08-03&end_date=2026-08-20&limit=50",
    );
  });

  it("omits blank optional parameters", () => {
    const query = buildRunVisibilityQuery(
      toApiParams({ ...BASE_FILTERS, gameWeek: undefined, gameId: undefined }),
    );
    expect(query.has("game_week")).toBe(false);
    expect(query.has("game_id")).toBe(false);
  });

  it("includes optional parameters when present", () => {
    const query = buildRunVisibilityQuery(
      toApiParams({ ...BASE_FILTERS, gameWeek: "preseason_week_1", gameId: "20260813_ARI@LV" }),
    );
    expect(query.get("game_week")).toBe("preseason_week_1");
    expect(query.get("game_id")).toBe("20260813_ARI@LV");
  });

  it("defaults limit to 50", () => {
    expect(toApiParams({ ...BASE_FILTERS, limit: undefined }).limit).toBe(DEFAULT_LIMIT);
  });
});

describe("request behavior", () => {
  it("attaches the Firebase bearer token and targets the development base", async () => {
    const fetchMock = mockFetch(RUN_VISIBILITY_FIXTURE);
    await getRunVisibility(BASE_FILTERS);

    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url.startsWith(`${RUN_VISIBILITY_API_BASE}/admin/gamelens/run-visibility?`)).toBe(true);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer test-id-token");
    expect(init.method).toBe("GET");
  });

  it("never uses the shared production API base", async () => {
    const fetchMock = mockFetch(RUN_VISIBILITY_FIXTURE);
    await getRunVisibility(BASE_FILTERS);
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).not.toContain(API_BASE);
    expect(API_BASE).toBe("https://nfl-games-app-main-362530996210.us-central1.run.app");
  });

  it("guards ranges longer than 31 inclusive days before fetching", async () => {
    const fetchMock = mockFetch(RUN_VISIBILITY_FIXTURE);
    await expect(
      getRunVisibility({ ...BASE_FILTERS, startDate: "2026-07-01", endDate: "2026-08-20" }),
    ).rejects.toMatchObject({ kind: "range_too_large" });
    expect(fetchMock).not.toHaveBeenCalled();
    expect(MAX_RANGE_DAYS).toBe(31);
  });

  it("returns full stage evidence when game_id is supplied", async () => {
    const fetchMock = mockFetch(RUN_VISIBILITY_DETAIL_FIXTURE);
    const result = await getRunVisibility({ ...BASE_FILTERS, gameId: "20260813_ARI@LV" });

    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("game_id=20260813_ARI%40LV");
    expect(result.selected_game?.capture_id).toBe("cap_20260813_ari_lv");
    expect(result.selected_game?.clocks).toHaveLength(3);
    expect(result.selected_game?.clocks[0].stages[0].reason).toContain("schedule table");
  });

  it("never falls back to mock data when the request fails", async () => {
    mockFetch({ error: "run_visibility_query_failed" }, { status: 500 });
    await expect(getRunVisibility(BASE_FILTERS)).rejects.toBeInstanceOf(RunVisibilityError);
  });
});

describe("error mapping", () => {
  const cases: Array<[number, string, string]> = [
    [400, "invalid_run_visibility_request", "invalid_request"],
    [401, "unauthorized", "unauthenticated"],
    [403, "forbidden", "forbidden"],
    [403, "development_source_unavailable", "source_unavailable"],
    [404, "game_week_not_found", "week_not_found"],
    [404, "game_not_found", "game_not_found"],
    [500, "run_visibility_query_failed", "server"],
  ];

  it.each(cases)("maps %i %s to %s", async (status, code, kind) => {
    mockFetch({ error: code }, { status });
    await expect(getRunVisibility(BASE_FILTERS)).rejects.toMatchObject({ kind });
  });

  it("never exposes 500 exception detail", async () => {
    mockFetch({ error: "run_visibility_query_failed", message: "psycopg2 traceback" }, { status: 500 });
    await expect(getRunVisibility(BASE_FILTERS)).rejects.toMatchObject({
      message: "Run Visibility could not read evidence right now.",
    });
  });
});

describe("normalization", () => {
  const result = normalizeRunVisibility(RUN_VISIBILITY_FIXTURE, DEFAULT_LEARNING_RUN_ID);

  it("counts a game as captured only when the pregame snapshot stage completed", () => {
    const captured = result.games.find((game) => game.game_id === "20260813_ARI@LV");
    const gap = result.games.find((game) => game.game_id === "20260813_BUF@NYG");
    expect(captured?.captured).toBe(true);
    expect(gap?.captured).toBe(false);
  });

  it("derives day summaries from compact game rows", () => {
    expect(result.days).toHaveLength(1);
    expect(result.days[0]).toMatchObject({
      game_date: "2026-08-13",
      scheduled: 2,
      captured: 1,
      known_gaps: 1,
      needs_attention: 0,
    });
  });

  it("keeps status and attention separate and does not promote warnings", () => {
    const gap = result.games.find((game) => game.game_id === "20260813_BUF@NYG");
    expect(gap?.overall).toMatchObject({ status: "warning", attention: "known_gap" });
    const complete = result.games.find((game) => game.game_id === "20260813_ARI@LV");
    expect(complete?.overall.attention).toBe("none");
  });

  it("renders unknown future states neutrally instead of crashing", () => {
    const payload = {
      ...RUN_VISIBILITY_FIXTURE,
      games: [{ ...RUN_VISIBILITY_FIXTURE.games[0], state: "quantum_pending" }],
    };
    const parsed = normalizeRunVisibility(payload, DEFAULT_LEARNING_RUN_ID);
    expect(parsed.games[0].overall).toMatchObject({ status: "not_applicable", attention: "none" });
  });

  it("surfaces truncated results", () => {
    const payload = {
      ...RUN_VISIBILITY_FIXTURE,
      overview: {
        ...RUN_VISIBILITY_FIXTURE.overview,
        games: { ...RUN_VISIBILITY_FIXTURE.overview.games, truncated: true, returned: 50 },
      },
    };
    const parsed = normalizeRunVisibility(payload, DEFAULT_LEARNING_RUN_ID);
    expect(parsed.overview.truncated).toBe(true);
    expect(parsed.overview.returned).toBe(50);
  });

  it("maps recent runs to friendly labels with the attempt id kept for drill-down", () => {
    expect(result.recent_runs[0]).toMatchObject({
      display_label: "Snapshot capture · Aug 15, 2026 · 23:42 UTC",
      scope_label: "8 games in scope · 3 captured",
      attempt_id: "att_20260815_2342_snapshot",
      duration_ms: 164000,
    });
  });
});
