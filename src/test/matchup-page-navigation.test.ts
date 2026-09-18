import { describe, expect, it } from "vitest";
import {
  buildMatchupLensHref,
  isFinalGameStatus,
  matchupLabActionLabel,
} from "@/lib/matchup-lens-link";

describe("game details Matchup Lens link", () => {
  it("opens the selected game with its away and home teams in Overview", () => {
    expect(buildMatchupLensHref("20260917_DET@BUF", "DET", "BUF")).toBe(
      "/matchup-lens?a=DET&b=BUF&view=overview&game=20260917_DET%40BUF",
    );
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