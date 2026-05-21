import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Info } from "lucide-react";
import type { GameDetails } from "@/lib/nfl-api";

type CoreAreaSummary = NonNullable<
  NonNullable<GameDetails["matchup_breakdown"]>["core_area_summaries"]
>[number];

interface Props {
  rows: NonNullable<GameDetails["core_area_comparison"]>;
  awayAbbr: string;
  homeAbbr: string;
  summaries?: NonNullable<
    NonNullable<GameDetails["matchup_breakdown"]>["core_area_summaries"]
  > | null;
}

const pct = (n: number) =>
  Math.max(0, Math.min(100, Math.round((n ?? 0) * 100)));

/**
 * Frontend-only relationship microcopy connecting each core area back to the
 * Game Profile signals shown above. Display labels only — never alters scores
 * or model behavior. Matched case-insensitively against backend `core_area`.
 */
const RELATIONSHIP_LABEL: Record<string, string> = {
  "disruption and turnovers": "Supports Pressure + Turnover Risk",
  "scoring efficiency": "Supports Scoring Efficiency",
  "defensive control": "Defensive context",
  "offensive output": "Offensive context",
  "field control": "Field position context",
};

const normKey = (s: string | null | undefined) =>
  (s ?? "").trim().toLowerCase();

const JARGON_TOKENS = ["claim", "language_support", "lens_tag", "code:", "index:", "score:"];
const NOISE_RE = /^(n\/?a|tbd|none|no data|no summary|—|-)$/i;

function findSummary(
  coreArea: string,
  summaries: CoreAreaSummary[] | null | undefined,
): CoreAreaSummary | null {
  if (!summaries || summaries.length === 0) return null;
  const key = normKey(coreArea);
  return (
    summaries.find((s) => normKey(s.core_area) === key) ??
    summaries.find((s) => normKey(s.name) === key) ??
    null
  );
}

function isUsableSummary(s: CoreAreaSummary | null): s is CoreAreaSummary {
  if (!s) return false;
  const text = (s.summary ?? "").trim();
  if (text.length < 16 || text.length > 240) return false;
  if (NOISE_RE.test(text)) return false;
  const lower = text.toLowerCase();
  if (JARGON_TOKENS.some((t) => lower.includes(t))) return false;
  return true;
}

function buildTitle(s: CoreAreaSummary, coreArea: string): string {
  const team = (s.leader_team ?? "").trim();
  const safeTeam =
    team.length > 0 && team.length <= 24 && /^[A-Za-z][A-Za-z .'-]*$/.test(team);
  if ((s.leader === "away" || s.leader === "home") && safeTeam) {
    return `Why ${coreArea} leans ${team}`;
  }
  if (s.leader === "neutral") return "Why this area is even";
  return "Why this area matters";
}

function pickDriverLabels(s: CoreAreaSummary): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const d of s.drivers ?? []) {
    if (out.length >= 2) break;
    const raw = typeof d === "string" ? d : (d?.label ?? "");
    const label = (raw ?? "").trim();
    if (!label || label.length > 40) continue;
    const k = label.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(label);
  }
  return out;
}

export function CoreAreaAdvantage({ rows, awayAbbr, homeAbbr, summaries }: Props) {
  if (!rows || rows.length === 0) return null;

  return (
    <Card className="mb-6 border-border bg-card">
      <CardContent className="p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Core Area Advantage
          </h3>
          <span className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground/60">
            Category Edge
          </span>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Broad team-strength categories behind the matchup signals.
        </p>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {rows.map((row) => {
            const away = pct(row.away_score);
            const home = pct(row.home_score);
            const isNeutral = row.leader === "neutral" || away === home;
            const edgeLabel = isNeutral
              ? "Even"
              : row.leader === "away"
                ? `${awayAbbr} Edge`
                : row.leader === "home"
                  ? `${homeAbbr} Edge`
                  : "Even";

            const relationship = RELATIONSHIP_LABEL[row.core_area.toLowerCase()];

            const matched = findSummary(row.core_area, summaries);
            const usable = isUsableSummary(matched) ? matched : null;
            const title = usable ? buildTitle(usable, row.core_area) : "";
            const driverLabels = usable ? pickDriverLabels(usable) : [];

            // v1.7.14: prefer backend-translated display fields for the tile
            // header label. Falls back to legacy `leader`-derived label.
            const STRENGTH_MAP: Record<string, string> = {
              near_even: "Near Even",
              lean: "Lean",
              edge: "Edge",
              strong_edge: "Strong Edge",
            };
            const rawStrength = (matched?.display_strength ?? "").toString().trim().toLowerCase();
            const mappedStrength = STRENGTH_MAP[rawStrength];
            const leaderTeamRaw = (matched?.leader_team ?? "").trim();
            const safeLeaderTeam =
              leaderTeamRaw.length > 0 &&
              leaderTeamRaw.length <= 24 &&
              /^[A-Za-z][A-Za-z .'-]*$/.test(leaderTeamRaw);
            const directionalStrength =
              rawStrength === "lean" || rawStrength === "edge" || rawStrength === "strong_edge";

            let displayEdgeLabel = edgeLabel;
            let isDisplayNeutral = isNeutral;
            if (directionalStrength && safeLeaderTeam && mappedStrength) {
              displayEdgeLabel = `${leaderTeamRaw} ${mappedStrength}`;
              isDisplayNeutral = false;
            } else if (rawStrength === "near_even") {
              displayEdgeLabel = "Near Even";
              isDisplayNeutral = true;
            }

            // Caption precedence: display_summary -> existing summary -> relationship label
            const displaySummaryRaw = (matched?.display_summary ?? "").trim();
            const displaySummaryUsable =
              displaySummaryRaw.length >= 16 &&
              displaySummaryRaw.length <= 240 &&
              !NOISE_RE.test(displaySummaryRaw) &&
              !JARGON_TOKENS.some((t) => displaySummaryRaw.toLowerCase().includes(t));
            const captionText = displaySummaryUsable
              ? displaySummaryRaw
              : usable?.summary?.trim() || relationship || "";

            return (
              <div
                key={row.core_area}
                className="rounded-md border border-border/60 bg-muted/5 p-3 transition-colors hover:border-border/80 hover:bg-muted/10"
              >
                <div className="mb-1 flex items-baseline justify-between gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {row.core_area}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {usable && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Why ${row.core_area} matters`}
                            className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground/60 transition-colors hover:bg-muted/30 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/50"
                          >
                            <Info className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </PopoverTrigger>

                        <PopoverContent
                          align="end"
                          side="bottom"
                          className="w-72 border-border bg-popover p-3"
                        >
                          <p className="mb-1.5 text-xs font-medium text-foreground">
                            {title}
                          </p>
                          <p className="text-[11.5px] leading-relaxed text-muted-foreground">
                            {usable.summary!.trim()}
                          </p>
                          {driverLabels.length > 0 && (
                            <p className="mt-2 text-[10.5px] text-muted-foreground/80">
                              Key inputs: {driverLabels.join(", ")}.
                            </p>
                          )}
                        </PopoverContent>
                      </Popover>
                    )}
                    <span
                      className={`text-[10px] uppercase tracking-[0.1em] ${
                        isNeutral
                          ? "text-muted-foreground"
                          : "font-semibold text-foreground"
                      }`}
                    >
                      {edgeLabel}
                    </span>
                  </div>
                </div>

                {relationship && (
                  <p className="mb-2 text-[10px] text-muted-foreground/70">
                    {relationship}
                  </p>
                )}

                <div className="mb-1.5 flex items-baseline justify-between text-[11px] tabular-nums text-muted-foreground">
                  <span
                    className={
                      row.leader === "away" && !isNeutral
                        ? "font-semibold text-foreground"
                        : ""
                    }
                  >
                    {awayAbbr} {away}%
                  </span>
                  <span
                    className={
                      row.leader === "home" && !isNeutral
                        ? "font-semibold text-foreground"
                        : ""
                    }
                  >
                    {homeAbbr} {home}%
                  </span>
                </div>

                <div className="flex h-1.5 overflow-hidden rounded-full bg-muted/40">
                  <div
                    className={`h-full ${
                      row.leader === "away" ? "bg-accent-cool/80" : "bg-accent-cool/35"
                    }`}
                    style={{ width: `${away}%` }}
                  />
                  <div
                    className={`h-full ${
                      row.leader === "home" ? "bg-primary/80" : "bg-primary/35"
                    }`}
                    style={{ width: `${home}%` }}
                  />
                </div>

                <p
                  className="mt-2 text-[10px] text-muted-foreground/60"
                  title={`${row.metric_count} metrics included in this category score`}
                >
                  {row.metric_count} metrics
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
