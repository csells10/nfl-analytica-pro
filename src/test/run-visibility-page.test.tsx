import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, renderHook } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";
import AdminRunVisibility from "@/pages/AdminRunVisibility";
import {
  useRunVisibility,
  useRunVisibilityDay,
  useRunVisibilityGame,
} from "@/hooks/useRunVisibility";
import { DEFAULT_LEARNING_RUN_ID, type RunVisibilityFilters } from "@/lib/run-visibility";
import { RUN_VISIBILITY_FIXTURE } from "@/lib/run-visibility.fixture";

const meMock = vi.fn();

vi.mock("@/lib/admin-api", () => ({
  useMe: () => meMock(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { email: "viewer@gamelens.io" }, signOut: vi.fn() }),
}));

vi.mock("@/components/AppShell", () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/lib/firebase", () => ({
  getAuthToken: vi.fn(async () => "test-id-token"),
  firebaseAuth: {},
}));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/admin/run-visibility"]}>{children}</MemoryRouter>
    </QueryClientProvider>
  );
}

const FILTERS: RunVisibilityFilters = {
  season: "2026",
  seasonType: "preseason",
  learningRunId: DEFAULT_LEARNING_RUN_ID,
  datePreset: "custom",
  startDate: "2026-08-03",
  endDate: "2026-08-20",
  limit: 50,
};

beforeEach(() => {
  meMock.mockReset();
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(RUN_VISIBILITY_FIXTURE), { status: 200 })),
  );
});

describe("Run Visibility route protection", () => {
  it("rejects an authenticated non-admin who navigates directly", async () => {
    meMock.mockReturnValue({ data: { is_admin: false, email: "viewer@gamelens.io" }, isLoading: false });
    render(<AdminRunVisibility />, { wrapper });

    expect(await screen.findByText("Admin access required")).toBeInTheDocument();
    expect(screen.queryByText("GameLens Run Visibility")).not.toBeInTheDocument();
  });

  it("renders the dashboard for an admin", async () => {
    meMock.mockReturnValue({ data: { is_admin: true, email: "admin@gamelens.io" }, isLoading: false });
    render(<AdminRunVisibility />, { wrapper });

    expect(await screen.findByText("GameLens Run Visibility")).toBeInTheDocument();
  });
});

describe("React Query keys", () => {
  it("uses distinct keys for overview, day and game requests", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(
      () => {
        useRunVisibility(FILTERS);
        useRunVisibilityDay(FILTERS, "2026-08-13");
        useRunVisibilityGame(FILTERS, "20260813_ARI@LV", "2026-08-13");
      },
      { wrapper: localWrapper },
    );

    await waitFor(() => expect(client.getQueryCache().getAll().length).toBe(3));

    const keys = client.getQueryCache().getAll().map((query) => JSON.stringify(query.queryKey));
    expect(new Set(keys).size).toBe(3);
    expect(keys.some((key) => key.includes('"day"') && key.includes('"start_date":"2026-08-13"'))).toBe(true);
    expect(keys.some((key) => key.includes('"game"') && key.includes("20260813_ARI@LV"))).toBe(true);
  });

  it("marks operational queries as non-persistable", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const localWrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    renderHook(() => useRunVisibility(FILTERS), { wrapper: localWrapper });
    await waitFor(() => expect(client.getQueryCache().getAll().length).toBe(1));
    expect(client.getQueryCache().getAll()[0].meta?.persist).toBe(false);
  });
});

describe("Run Visibility error panel diagnostics", () => {
  it("shows the friendly message plus one safe diagnostic line on a backend failure", async () => {
    meMock.mockReturnValue({ data: { is_admin: true, email: "admin@gamelens.io" }, isLoading: false });
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(JSON.stringify({ error: "run_visibility_query_failed", message: "psycopg2 traceback" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );

    render(<AdminRunVisibility />, { wrapper });

    expect(
      await screen.findByText("Run Visibility could not read evidence right now."),
    ).toBeInTheDocument();

    const diagnostic = await screen.findByTestId("run-visibility-diagnostic");
    expect(diagnostic.textContent).toContain("phase: response");
    expect(diagnostic.textContent).toContain("status: 500");
    expect(diagnostic.textContent).toContain("code: run_visibility_query_failed");
    // auth: true means a non-empty token was attached, not that it was accepted.
    expect(diagnostic.textContent).toContain("auth: true");
    expect(diagnostic.textContent).not.toContain("test-id-token");
    expect(diagnostic.textContent).not.toContain("Bearer");
    expect(diagnostic.textContent).not.toContain("psycopg2");
  });
});
