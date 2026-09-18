import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({
  isAdmin: false,
  signOut: vi.fn(async () => undefined),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Christian", email: "christian@gamelens.io" },
    signOut: mocks.signOut,
  }),
}));
vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({
  useMe: () => ({ data: { is_admin: mocks.isAdmin } }),
}));

import AppShell from "@/components/AppShell";

function renderShell() {
  return render(
    <MemoryRouter>
      <AppShell>
        <p>Page</p>
      </AppShell>
    </MemoryRouter>,
  );
}

describe("AppShell navigation and account menu", () => {
  beforeEach(() => {
    mocks.isAdmin = false;
    mocks.signOut.mockClear();
    localStorage.clear();
  });

  it("keeps Matchups as the only primary destination on desktop and mobile", () => {
    renderShell();
    expect(screen.getAllByRole("link", { name: "Matchups" })).toHaveLength(2);
    expect(screen.queryByRole("link", { name: "Matchup Lens" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Settings" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Admin" })).toBeNull();
    expect(screen.getByRole("button", { name: "Open guide" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Switch to light theme" })).toBeTruthy();
  });

  it("opens the non-admin account menu from the keyboard and signs out", async () => {
    const user = userEvent.setup();
    renderShell();
    const trigger = screen.getByRole("button", { name: "Open account menu for Christian" });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(await screen.findByRole("menuitem", { name: "Settings" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Admin" })).toBeNull();
    const signOut = screen.getByRole("menuitem", { name: "Sign out" });
    signOut.focus();
    await user.keyboard("{Enter}");
    expect(mocks.signOut).toHaveBeenCalledTimes(1);
  });

  it("shows Admin in the account menu only for an authorized user", async () => {
    mocks.isAdmin = true;
    const user = userEvent.setup();
    renderShell();
    await user.click(screen.getByRole("button", { name: "Open account menu for Christian" }));
    expect(await screen.findByRole("menuitem", { name: "Admin" })).toHaveAttribute(
      "href",
      "/admin/claim-health",
    );
  });
});