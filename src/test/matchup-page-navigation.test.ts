import { describe, expect, it } from "vitest";
import {
  buildMatchupLensHref,
  isFinalGameStatus,
  matchupLabActionLabel,
} from "@/lib/matchup-lens-link";

describe("game details Matchup Lens link", () => {
  it.each(["Matchups date page", "team-versus-team game details"])(
    "sends the %s entry through the shared Lab route and loading context",
    () => {
      expect(buildMatchupLensHref("20260917_DET@BUF", "DET", "BUF")).toBe(
        "/matchup-lens?a=DET&b=BUF&view=overview&game=20260917_DET%40BUF",
      );
    },
  );

  it("keeps a valid direct Lab link neutral when team context is omitted", () => {
    const direct = `/matchup-lens?view=overview&game=${encodeURIComponent("20260917_DET@BUF")}`;
    expect(new URLSearchParams(direct.split("?")[1]).has("a")).toBe(false);
    expect(new URLSearchParams(direct.split("?")[1]).has("b")).toBe(false);
  });

  it.each(["Scheduled", "In Progress", "Halftime"])(
    "labels %s games as openable in Matchup Lab",
    (status) => {
      expect(matchupLabActionLabel(status)).toBe("Open in Matchup Lab");
    },
  );

  it.each(["Final", "Final/OT"])("reuses final classification for %s", (status) => {
    expect(isFinalGameStatus(status)).toBe(true);
    expect(matchupLabActionLabel(status)).toBe("Review in Matchup Lab");
  });
});