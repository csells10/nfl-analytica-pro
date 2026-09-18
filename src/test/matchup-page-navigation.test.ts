import { describe, expect, it } from "vitest";
import { buildMatchupLensHref } from "@/lib/matchup-lens-link";

describe("game details Matchup Lens link", () => {
  it("opens the selected game with its away and home teams in Overview", () => {
    expect(buildMatchupLensHref("20260917_DET@BUF", "DET", "BUF")).toBe(
      "/matchup-lens?a=DET&b=BUF&view=overview&game=20260917_DET%40BUF",
    );
  });
});