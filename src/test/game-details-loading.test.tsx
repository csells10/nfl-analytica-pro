import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MatchupAnalyzing } from "@/components/MatchupAnalyzing";

describe("Game Details Matchup Briefing", () => {
  it("shows recognized navigation identity and truthful static scope", () => {
    render(
      <MatchupAnalyzing
        awayTeam="NYG"
        homeTeam="DET"
        date="September 20, 2026"
        week={2}
      />,
    );

    const loading = screen.getByTestId("game-details-loading");
    expect(screen.getByText("New York Giants")).toBeTruthy();
    expect(screen.getByText("Detroit Lions")).toBeTruthy();
    expect(screen.getByText("at")).toBeTruthy();
    expect(screen.getByAltText("New York Giants logo").getAttribute("src")).toContain("/nyg.png");
    expect(screen.getByAltText("Detroit Lions logo").getAttribute("src")).toContain("/det.png");
    expect(screen.getByText("September 20, 2026 · Week 2")).toBeTruthy();
    expect(screen.getByText("Preparing game analysis")).toBeTruthy();
    expect(screen.getByText("Game Profile")).toBeTruthy();
    expect(screen.getByText("Core Areas")).toBeTruthy();
    expect(screen.getByText("Team Comparison")).toBeTruthy();
    expect(loading.getAttribute("role")).toBe("status");
    expect(loading.getAttribute("aria-live")).toBe("polite");
    expect(loading.className).toContain("animate-matchup-reveal");
    expect(loading.className).toContain("motion-reduce:animate-none");
    expect(loading.className).not.toMatch(/pulse|shimmer|bounce|spin/);
  });

  it.each([
    { awayTeam: "ZZZ", homeTeam: "DET" },
    { awayTeam: "NYG", homeTeam: undefined },
    {},
  ])("shows a neutral briefing when temporary identity is unsafe", (context) => {
    render(<MatchupAnalyzing {...context} />);

    const loading = screen.getByTestId("game-details-loading");
    expect(loading.textContent).toBe("Preparing game analysis");
    expect(loading.querySelector("img")).toBeNull();
    expect(screen.queryByText("Game Profile")).toBeNull();
    expect(screen.queryByText("Core Areas")).toBeNull();
    expect(screen.queryByText("Team Comparison")).toBeNull();
  });

  it("contains no premature scores, evidence, conclusions, or animated placeholders", () => {
    const { container } = render(<MatchupAnalyzing awayTeam="NYG" homeTeam="DET" />);
    expect(container.textContent).not.toMatch(/score|evidence|advantage|lean|readiness|warning/i);
    expect(container.innerHTML).not.toMatch(/shimmer|skeleton|animate-pulse|animate-spin|animate-bounce/);
  });
});