import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({
    user: { name: "Christian", email: "christian@gamelens.io" },
    signOut: vi.fn(),
    signInWithGoogle: vi.fn(async () => undefined),
    signInWithGoogleCredential: vi.fn(async () => undefined),
    isLoading: false,
    isSigningIn: false,
    isReady: true,
    authError: null,
    clearAuthError: vi.fn(),
  }),
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

describe("probe", () => {
  it("renders login", () => {
    render(<MemoryRouter><Login /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Request access" })).toBeTruthy();
  });
});
