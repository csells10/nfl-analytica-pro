import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LensConstellation } from "@/components/matchup-lens/LensConstellation";
import { LensDetail } from "@/components/matchup-lens/LensDetail";
import { LensRail } from "@/components/matchup-lens/LensRail";
import { InsightCards } from "@/components/matchup-lens/InsightCards";
import { TopProfileGaps } from "@/components/matchup-lens/TopProfileGaps";
import { GameBrief } from "@/components/matchup-lens/GameBrief";
import { CollisionPreview } from "@/components/matchup-lens/CollisionPreview";
import { MatchupCollision } from "@/components/matchup-lens/MatchupCollision";
import { MomentumShift } from "@/components/matchup-lens/MomentumShift";
import { TraceDrawer } from "@/components/matchup-lens/TraceDrawer";
import { getLensSnapshotSource } from "@/lib/matchup-lens-source";
import { lensGaps } from "@/lib/matchup-lens-compare";
import { collisionDirections } from "@/lib/matchup-lens-collision";
import { buildGameBrief } from "@/lib/matchup-lens-brief";
import { buildProfileAngle } from "@/lib/matchup-lens-angle";
import { momentumReadiness } from "@/lib/matchup-lens-momentum";
import { buildTrace, type TraceTarget } from "@/lib/matchup-lens-trace";
import {
  parseLayout,
  parseView,
  type ConstellationLayout,
  type LensView,
} from "@/lib/matchup-lens-view";
import { DASHBOARD_PURPOSE } from "@/lib/matchup-lens-language";
import { LENSES, findTeam, scoreAllLenses } from "@/lib/matchup-lens";
import { getTeam, teamLogoUrl } from "@/lib/nfl-teams";

const DEFAULT_AWAY = "LAR";
const DEFAULT_HOME = "CLE";

/** The snapshot uses WSH; the shared team registry uses WAS. */
function registryAbbr(teamAbv: string): string {
  return teamAbv === "WSH" ? "WAS" : teamAbv;
}

/** Inbound deep links (Games/Slate) may carry the registry spelling. */
export function snapshotAbbr(teamAbv: string): string {
  return teamAbv.toUpperCase() === "WAS" ? "WSH" : teamAbv.toUpperCase();
}

function teamName(teamAbv: string): string {
  return getTeam(registryAbbr(teamAbv)).fullName;
}

function TeamPicker({
  value,
  options,
  onChange,
  role,
  tone,
}: {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  role: string;
  tone: "a" | "b";
}) {
  return (
    <div className="min-w-0 flex-1">
      <p
        className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
          tone === "a" ? "text-accent-cool" : "text-primary"
        }`}
      >
        {role}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full" aria-label={`${role} team`}>
          <div className="flex min-w-0 items-center gap-2">
            <img
              src={teamLogoUrl(registryAbbr(value), 500)}
              alt=""
              className="h-5 w-5 shrink-0"
              loading="lazy"
            />
            <SelectValue />
          </div>
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {options.map((abv) => (
            <SelectItem key={abv} value={abv}>
              {abv} · {getTeam(registryAbbr(abv)).shortName}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export default function MatchupLens() {
  const source = getLensSnapshotSource();
  const { data: snapshot, isLoading } = useQuery({
    queryKey: ["lens-snapshot", source.id],
    queryFn: source.load,
    staleTime: Infinity,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const initial = parseView(searchParams.get("view"), searchParams.get("mode"));

  const [awayAbv, setAwayAbv] = useState(() => snapshotAbbr(searchParams.get("a") ?? DEFAULT_AWAY));
  const [homeAbv, setHomeAbv] = useState(() => snapshotAbbr(searchParams.get("b") ?? DEFAULT_HOME));
  const [view, setView] = useState<LensView>(initial.view);
  const [layout, setLayout] = useState<ConstellationLayout>(() =>
    parseLayout(searchParams.get("layout"), initial.layout),
  );
  /** No lens evidence is shown until the user deliberately selects one. */
  const [selectedLens, setSelectedLens] = useState<string | null>(
    () => LENSES.find((lens) => lens.key === searchParams.get("lens"))?.key ?? null,
  );
  const [hoveredLens, setHoveredLens] = useState<string | null>(null);
  const [collisionKey, setCollisionKey] = useState<string | null>(
    () => searchParams.get("collision"),
  );
  const [trace, setTrace] = useState<TraceTarget | null>(() => {
    const raw = searchParams.get("trace");
    if (!raw) return null;
    const [type, ...rest] = raw.split(":");
    if ((type === "tag" || type === "metric") && rest.length > 0) {
      return { type, id: rest.join(":") };
    }
    return null;
  });

  const teamOptions = useMemo(
    () => (snapshot ? snapshot.teams.map((team) => team.teamAbv).sort() : []),
    [snapshot],
  );

  // Fall back to the defaults when a deep link names a team the snapshot lacks.
  useEffect(() => {
    if (teamOptions.length === 0) return;
    if (!teamOptions.includes(awayAbv)) setAwayAbv(DEFAULT_AWAY);
    if (!teamOptions.includes(homeAbv)) setHomeAbv(DEFAULT_HOME);
  }, [teamOptions, awayAbv, homeAbv]);

  useEffect(() => {
    if (awayAbv === homeAbv && teamOptions.length > 1) {
      const next = teamOptions.find((abv) => abv !== awayAbv);
      if (next) setHomeAbv(next);
    }
  }, [awayAbv, homeAbv, teamOptions]);

  const momentum = useMemo(() => momentumReadiness(snapshot ? [snapshot] : []), [snapshot]);

  // Momentum is never reachable without real comparable history.
  useEffect(() => {
    if (view === "momentum" && !momentum.eligible && snapshot) setView("overview");
  }, [view, momentum.eligible, snapshot]);

  // Shared state lives in the URL so the matchup survives reload, back and share.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("mode");
    next.set("a", awayAbv);
    next.set("b", homeAbv);
    next.set("view", view);
    if (view === "constellation" && layout === "side") next.set("layout", "side");
    else next.delete("layout");
    if (selectedLens) next.set("lens", selectedLens);
    else next.delete("lens");
    if (collisionKey) next.set("collision", collisionKey);
    else next.delete("collision");
    if (trace) next.set("trace", `${trace.type}:${trace.id}`);
    else next.delete("trace");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [awayAbv, homeAbv, view, layout, selectedLens, collisionKey, trace, searchParams, setSearchParams]);

  const away = snapshot ? findTeam(snapshot, awayAbv) : undefined;
  const home = snapshot ? findTeam(snapshot, homeAbv) : undefined;

  const scoresA = useMemo(
    () => (snapshot && away ? scoreAllLenses(snapshot, away) : []),
    [snapshot, away],
  );
  const scoresB = useMemo(
    () => (snapshot && home ? scoreAllLenses(snapshot, home) : []),
    [snapshot, home],
  );

  const gaps = useMemo(() => lensGaps(scoresA, scoresB), [scoresA, scoresB]);
  const axes = LENSES.map((lens, index) => ({
    key: lens.key,
    name: lens.name,
    scoreA: scoresA[index]?.score ?? null,
    scoreB: scoresB[index]?.score ?? null,
  }));

  const activeKey = view === "constellation" ? (hoveredLens ?? selectedLens) : selectedLens;
  const activeLens = LENSES.find((lens) => lens.key === activeKey) ?? null;
  const activeA = activeLens ? scoresA.find((score) => score.lensKey === activeLens.key) : undefined;
  const activeB = activeLens ? scoresB.find((score) => score.lensKey === activeLens.key) : undefined;

  const directions = useMemo(
    () => (snapshot && away && home ? collisionDirections(snapshot, away, home) : []),
    [snapshot, away, home],
  );

  const brief = useMemo(
    () => (snapshot && away && home ? buildGameBrief(snapshot, away, home, awayAbv, homeAbv) : null),
    [snapshot, away, home, awayAbv, homeAbv],
  );

  const angle = useMemo(() => {
    if (!snapshot || !away || !home || !brief) return null;
    const exclude = [brief.largest?.key, brief.closest?.key].filter(
      (key): key is string => typeof key === "string",
    );
    return buildProfileAngle(snapshot, away, home, awayAbv, homeAbv, gaps, exclude);
  }, [snapshot, away, home, brief, gaps, awayAbv, homeAbv]);

  const traceData = useMemo(
    () =>
      snapshot && away && home && trace
        ? buildTrace(snapshot, trace, selectedLens ?? LENSES[0].key, [away, home])
        : null,
    [snapshot, away, home, trace, selectedLens],
  );

  const openTrace = useCallback((target: TraceTarget) => setTrace(target), []);
  const selectLens = useCallback((key: string) => setSelectedLens(key), []);
  const openCollision = useCallback((key: string | null) => {
    setCollisionKey(key);
    setView("collision");
  }, []);

  const evidence =
    snapshot && away && home && activeLens && activeA && activeB ? (
      <LensDetail
        lens={activeLens}
        snapshot={snapshot}
        teamA={away}
        teamB={home}
        scoreA={activeA}
        scoreB={activeB}
        labelA={awayAbv}
        labelB={homeAbv}
        nameA={teamName(awayAbv)}
        nameB={teamName(homeAbv)}
        onOpenTrace={openTrace}
        onClose={() => setSelectedLens(null)}
      />
    ) : null;

  const backToDashboard = (
    <button
      type="button"
      data-testid="back-to-dashboard"
      onClick={() => setView("overview")}
      className="inline-flex min-h-[44px] items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      Back to {awayAbv} vs {homeAbv} dashboard
    </button>
  );

  return (
    <AppShell showGuide={false}>
      <div className="space-y-4">
        <header>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Matchup Dashboard</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">{DASHBOARD_PURPOSE}</p>
        </header>

        {isLoading || !snapshot || !away || !home ? (
          <Card className="border-border bg-card">
            <CardContent className="py-16 text-center text-sm text-muted-foreground">
              Loading lens snapshot…
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-border bg-card">
              <CardContent className="p-3 sm:p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3">
                  <TeamPicker
                    value={awayAbv}
                    options={teamOptions}
                    onChange={setAwayAbv}
                    role="Team A"
                    tone="a"
                  />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:pb-3">
                    vs
                  </span>
                  <TeamPicker
                    value={homeAbv}
                    options={teamOptions}
                    onChange={setHomeAbv}
                    role="Team B"
                    tone="b"
                  />
                </div>
                <p
                  className="mt-2 font-mono text-[11px] text-muted-foreground"
                  data-testid="lens-context-label"
                >
                  {snapshot.windowLabel} · as of {snapshot.asOfDate} · {awayAbv}{" "}
                  {away.gamesInWindow} games / {homeAbv} {home.gamesInWindow} games
                </p>
              </CardContent>
            </Card>

            <LensRail
              gaps={gaps}
              labelA={awayAbv}
              labelB={homeAbv}
              selectedKey={selectedLens}
              onSelect={selectLens}
            />

            {view === "overview" && brief && (
              <>
                <InsightCards
                  largest={brief.largest}
                  closest={brief.closest}
                  angle={angle}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  onSelectLens={selectLens}
                  onOpenCollision={openCollision}
                />

                <div className="grid gap-4 lg:grid-cols-12">
                  <div className="lg:col-span-5">
                    <GameBrief
                      brief={brief}
                      labelA={awayAbv}
                      labelB={homeAbv}
                      nameA={teamName(awayAbv)}
                      nameB={teamName(homeAbv)}
                      onSelectLens={selectLens}
                      onOpenCollision={openCollision}
                    />
                  </div>
                  <div className="lg:col-span-7">
                    <Card className="border-border bg-card">
                      <CardContent className="p-4 sm:p-5">
                        <LensConstellation
                          axes={axes}
                          labelA={awayAbv}
                          labelB={homeAbv}
                          nameA={teamName(awayAbv)}
                          nameB={teamName(homeAbv)}
                          selectedKey={selectedLens}
                          onSelect={selectLens}
                          onHover={setHoveredLens}
                          layout={layout}
                          onLayoutChange={setLayout}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>

                {evidence}

                <div className="grid gap-4 lg:grid-cols-2">
                  <CollisionPreview directions={directions} onOpen={openCollision} />
                  <TopProfileGaps
                    gaps={gaps}
                    snapshot={snapshot}
                    teamAbvA={awayAbv}
                    teamAbvB={homeAbv}
                    labelA={awayAbv}
                    labelB={homeAbv}
                    nameA={teamName(awayAbv)}
                    nameB={teamName(homeAbv)}
                    selectedKey={selectedLens}
                    onSelect={selectLens}
                    limit={3}
                    onOpenAll={() => setView("gaps")}
                  />
                </div>
              </>
            )}

            {view === "constellation" && (
              <div className="space-y-4">
                {backToDashboard}
                <Card className="border-border bg-card">
                  <CardContent className="p-4 sm:p-5">
                    <LensConstellation
                      axes={axes}
                      labelA={awayAbv}
                      labelB={homeAbv}
                      nameA={teamName(awayAbv)}
                      nameB={teamName(homeAbv)}
                      selectedKey={selectedLens}
                      onSelect={selectLens}
                      onHover={setHoveredLens}
                      layout={layout}
                      onLayoutChange={setLayout}
                    />
                  </CardContent>
                </Card>
                {evidence}
              </div>
            )}

            {view === "collision" && (
              <div className="space-y-4">
                {backToDashboard}
                <MatchupCollision
                  directions={directions}
                  selectedKey={collisionKey}
                  onSelect={setCollisionKey}
                  onOpenTrace={openTrace}
                />
                {evidence}
              </div>
            )}

            {view === "gaps" && (
              <div className="space-y-4">
                {backToDashboard}
                <TopProfileGaps
                  gaps={gaps}
                  snapshot={snapshot}
                  teamAbvA={awayAbv}
                  teamAbvB={homeAbv}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  nameA={teamName(awayAbv)}
                  nameB={teamName(homeAbv)}
                  selectedKey={selectedLens}
                  onSelect={selectLens}
                />
                {evidence}
              </div>
            )}

            {view === "momentum" && momentum.eligible && (
              <div className="space-y-4">
                {backToDashboard}
                <MomentumShift snapshots={[snapshot]} />
              </div>
            )}

            <TraceDrawer
              trace={traceData}
              target={trace}
              snapshot={snapshot}
              open={trace !== null}
              onOpenChange={(open) => !open && setTrace(null)}
              onOpenTrace={openTrace}
              onSelectLens={(key) => {
                setSelectedLens(key);
                setTrace(null);
              }}
              selectedLensName={activeLens?.name ?? "no selected lens"}
              matchupLabel={`${awayAbv} vs ${homeAbv}`}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
