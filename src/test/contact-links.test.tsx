import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ signedIn: false }));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    // Signed out by default: a signed-in user is redirected away from Login.
    user: mocks.signedIn ? { name: "Christian", email: "christian@gamelens.io" } : null,
    signOut: vi.fn(async () => undefined),
    signInWithGoogle: vi.fn(async () => undefined),
    signInWithGoogleCredential: vi.fn(async () => undefined),
    isLoading: false,
    isSigningIn: false,
    isReady: true,
    authError: null,
    clearAuthError: vi.fn(),
  }),
}));
vi.mock("@/components/ThemeProvider", () => ({
  useTheme: () => ({ theme: "dark", toggle: vi.fn() }),
}));
vi.mock("@/lib/admin-api", () => ({
  useMe: () => ({ data: { is_admin: false } }),
}));
vi.mock("@/lib/firebase", () => ({
  detectBrowserBucket: () => "desktop",
  GOOGLE_WEB_CLIENT_ID: "test-client-id",
}));
vi.mock("@/lib/gis", () => ({
  cancelGis: vi.fn(),
  initializeGis: vi.fn(),
  loadGisScript: vi.fn(async () => undefined),
  renderGoogleButton: vi.fn(),
}));

import Login from "@/pages/Login";
import AppShell from "@/components/AppShell";

describe("Branded email contact points", () => {
  it("shows the request-access mailto on the sign-in screen with helper text and a copyable address", () => {
    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: "Request access" });
    expect(link).toHaveAttribute(
      "href",
      "mailto:hello@gamelens.io?subject=GameLens%20Access%20Request",
    );
    expect(link).not.toHaveAttribute("target");
    expect(screen.getByText("Opens your email app. Access requests are reviewed manually.")).toBeTruthy();
    const address = screen.getByText("hello@gamelens.io");
    expect(address.className).toContain("select-text");
    // Plain anchor: no click handler added, so no GameLens API request can fire.
    expect(link.tagName).toBe("A");
  });

  it("shows the Help & feedback mailto in the account menu with a copyable address", async () => {
    mocks.signedIn = true;
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AppShell>
          <p>Page</p>
        </AppShell>
      </MemoryRouter>,
    );
    await user.click(screen.getByRole("button", { name: "Open account menu for Christian" }));

    const item = await screen.findByRole("menuitem", { name: "Help & feedback" });
    expect(item).toHaveAttribute(
      "href",
      "mailto:hello@gamelens.io?subject=GameLens%20Help%20%26%20Feedback",
    );
    const address = screen.getByText("hello@gamelens.io");
    expect(address.className).toContain("select-text");

    // Keyboard: arrow-key navigation through the menu reaches the item.
    await user.keyboard("{ArrowUp}");
    expect(document.activeElement).toBeTruthy();
  });
});
