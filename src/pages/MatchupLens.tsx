import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { LensExplorer } from "@/components/matchup-lens/LensExplorer";
import { InsightTicker } from "@/components/matchup-lens/InsightTicker";
import {
  DestinationCards,
  DESTINATION_ICONS,
  type Destination,
  type DestinationId,
} from "@/components/matchup-lens/DestinationCards";
import { MatchupContextBar } from "@/components/matchup-lens/MatchupContextBar";
import { ContinueExploring, JourneyBack, type JourneyStep } from "@/components/matchup-lens/JourneyNav";
import {
  DashboardEmpty,
  DashboardError,
  DashboardSkeleton,
} from "@/components/matchup-lens/DashboardStates";
import { TopProfileGaps } from "@/components/matchup-lens/TopProfileGaps";
import { GameBrief } from "@/components/matchup-lens/GameBrief";
import { MatchupCollision } from "@/components/matchup-lens/MatchupCollision";
import { MomentumShift } from "@/components/matchup-lens/MomentumShift";
import { TraceDrawer } from "@/components/matchup-lens/TraceDrawer";
import { getLensSnapshotSource } from "@/lib/matchup-lens-source";
import { lensGaps } from "@/lib/matchup-lens-compare";
import { collisionDirections, collisionHighlights } from "@/lib/matchup-lens-collision";
import { buildGameBrief } from "@/lib/matchup-lens-brief";
import { buildProfileAngle } from "@/lib/matchup-lens-angle";
import { buildInsightStories, type InsightStory } from "@/lib/matchup-lens-stories";
import { momentumReadiness } from "@/lib/matchup-lens-momentum";
import { buildTrace, type TraceTarget } from "@/lib/matchup-lens-trace";
import {
  originReturn,
  parseLayout,
  parseOrigin,
  parseView,
  type ConstellationLayout,
  type LensOrigin,
  type LensView,
} from "@/lib/matchup-lens-view";
import { DASHBOARD_PURPOSE } from "@/lib/matchup-lens-language";
import { LENS_GLOSSARY } from "@/lib/matchup-lens-glossary";
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
  const {
    data: snapshot,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["lens-snapshot", source.id],
    queryFn: source.load,
    staleTime: Infinity,
  });

  const [searchParams, setSearchParams] = useSearchParams();
  const initial = parseView(searchParams.get("view"), searchParams.get("mode"));

  const [awayAbv, setAwayAbv] = useState(() => snapshotAbbr(searchParams.get("a") ?? DEFAULT_AWAY));
  const [homeAbv, setHomeAbv] = useState(() => snapshotAbbr(searchParams.get("b") ?? DEFAULT_HOME));
  const [view, setView] = useState<LensView>(initial.view);
  /** Where the focused view was entered from, so one back action is enough. */
  const [origin, setOrigin] = useState<LensOrigin>(() => parseOrigin(searchParams.get("from")));
  const [layout, setLayout] = useState<ConstellationLayout>(() =>
    parseLayout(searchParams.get("layout"), initial.layout),
  );
  /** Remembered in the URL, but never rendered as evidence on the Overview. */
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

  const canvasRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

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
    if (view === "overview") next.delete("from");
    else next.set("from", origin);
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
  }, [awayAbv, homeAbv, view, origin, layout, selectedLens, collisionKey, trace, searchParams, setSearchParams]);


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
    () =>
      snapshot && away && home
        ? buildGameBrief(snapshot, away, home, awayAbv, homeAbv, teamName(awayAbv), teamName(homeAbv))
        : null,
    [snapshot, away, home, awayAbv, homeAbv],
  );

  const angle = useMemo(() => {
    if (!snapshot || !away || !home || !brief) return null;
    const exclude = [brief.largest?.key, brief.closest?.key].filter(
      (key): key is string => typeof key === "string",
    );
    return buildProfileAngle(snapshot, away, home, awayAbv, homeAbv, gaps, exclude);
  }, [snapshot, away, home, brief, gaps, awayAbv, homeAbv]);

  const stories = useMemo(
    () =>
      snapshot && away && home
        ? buildInsightStories({
            snapshot,
            teamA: away,
            teamB: home,
            labelA: awayAbv,
            labelB: homeAbv,
            nameA: teamName(awayAbv),
            nameB: teamName(homeAbv),
            gaps,
            angle,
            directions,
          })
        : [],
    [snapshot, away, home, awayAbv, homeAbv, gaps, angle, directions],
  );

  const traceData = useMemo(
    () =>
      snapshot && away && home && trace
        ? buildTrace(snapshot, trace, selectedLens ?? LENSES[0].key, [away, home])
        : null,
    [snapshot, away, home, trace, selectedLens],
  );

  const openTrace = useCallback((target: TraceTarget) => setTrace(target), []);

  /** Every selection replaces the canvas with a focused view. */
  const openLens = useCallback((key: string, from: LensOrigin = "overview") => {
    setSelectedLens(key);
    setOrigin(from);
    setView("lens");
  }, []);

  const openCollision = useCallback((key: string | null, from: LensOrigin = "overview") => {
    setCollisionKey(key);
    setOrigin(from);
    setView("collision");
  }, []);

  const openStory = useCallback(
    (story: InsightStory) => {
      if (story.target.kind === "collision") openCollision(story.target.collisionKey, "ticker");
      else openLens(story.target.lensKey, "ticker");
    },
    [openCollision, openLens],

  );

  const strongestCollision = useMemo(
    () => collisionHighlights(directions).strongest,
    [directions],
  );
  const largestGapKey = brief?.largest?.key ?? null;

  const destinations: Destination[] = [
    {
      id: "constellation",
      title: "Compare the teams",
      helper: "See the six profiles on one shared shape.",
      icon: DESTINATION_ICONS.constellation,
    },
    {
      id: "biggest-edge",
      title: "Explore the biggest edge",
      helper: "See the metrics behind the widest profile difference.",
      icon: DESTINATION_ICONS["biggest-edge"],
      disabled: largestGapKey === null,
    },
    {
      id: "collision",
      title: "See where profiles collide",
      helper: "Compare one team's behaviour with the opponent's counter-profile.",
      icon: DESTINATION_ICONS.collision,
    },
    {
      id: "lenses",
      title: "Browse all six lenses",
      helper: "Choose a football question, then inspect its evidence.",
      icon: DESTINATION_ICONS.lenses,
    },
  ];

  const openDestination = useCallback(
    (id: DestinationId) => {
      setOrigin("overview");
      if (id === "constellation") setView("constellation");
      else if (id === "lenses") setView("lenses");
      else if (id === "biggest-edge" && largestGapKey) openLens(largestGapKey, "biggest-edge");
      else if (id === "collision") openCollision(strongestCollision?.lane.key ?? null, "overview");
    },
    [largestGapKey, openCollision, openLens, strongestCollision],
  );


  const activeDestination: DestinationId | null =
    view === "constellation"
      ? "constellation"
      : view === "lenses"
        ? "lenses"
        : view === "collision"
          ? "collision"
          : view === "lens" && selectedLens === largestGapKey
            ? "biggest-edge"
            : null;

  const viewingLabel = useMemo(() => {
    if (view === "overview") return "Overview";
    if (view === "constellation") return "Constellation";
    if (view === "lenses") return "All six lenses";
    if (view === "gaps") return "Top profile gaps";
    if (view === "momentum") return "Momentum";
    if (view === "collision") {
      const lane = directions
        .flatMap((direction) => direction.lanes)
        .find((entry) => entry.key === collisionKey);
      return lane ? `${lane.definition.name} collision` : "Where profiles collide";
    }
    return activeLens?.name ?? "Lens detail";
  }, [view, directions, collisionKey, activeLens]);

  // Focused views take over the top of the canvas and are announced politely.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    setAnnouncement(`Viewing ${viewingLabel} for ${awayAbv} versus ${homeAbv}.`);
    if (view === "overview") return;
    canvasRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [viewingLabel, view, awayAbv, homeAbv]);

  const goOverview = useCallback(() => {
    setOrigin("overview");
    setView("overview");
  }, []);

  /** One contextual return: back to wherever this view was entered from. */
  const goBack = useCallback(() => {
    const target = originReturn(origin);
    setOrigin("overview");
    setView(target.view);
  }, [origin]);

  const changeMatchup = useCallback(() => {
    setOrigin("overview");
    setView("overview");
    window.requestAnimationFrame(() => {
      selectorRef.current?.querySelector("button")?.focus();
    });
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
      />
    ) : null;

  const lensIndex = LENSES.findIndex((lens) => lens.key === selectedLens);
  const stepLens = (direction: -1 | 1) => {
    const base = lensIndex < 0 ? 0 : lensIndex;
    const next = (base + direction + LENSES.length) % LENSES.length;
    setSelectedLens(LENSES[next].key);
  };

  const backLabel = originReturn(origin).label;

  const journeyBack = (withLensSelector = false) => (
    <JourneyBack
      backLabel={backLabel}
      onBack={goBack}
      lensSelector={
        withLensSelector && selectedLens
          ? {
              value: selectedLens,
              options: LENSES.map((lens) => ({
                key: lens.key,
                name: LENS_GLOSSARY[lens.key]?.name ?? lens.name,
              })),
              onChange: (key) => setSelectedLens(key),
              onPrev: () => stepLens(-1),
              onNext: () => stepLens(1),
            }
          : undefined
      }
    />
  );

  /** One to three meaningful next paths after the evidence on a focused view. */
  const continueSteps = (current: LensView): JourneyStep[] => [
    {
      id: "constellation",
      label: "Compare the teams",
      helper: "Both profiles on one shared shape.",
      icon: DESTINATION_ICONS.constellation,
      onSelect: () => {
        setOrigin("overview");
        setView("constellation");
      },
      disabled: current === "constellation",
    },
    {
      id: "collision",
      label: "See where profiles collide",
      helper: "Behaviour against the opponent's counter-profile.",
      icon: DESTINATION_ICONS.collision,
      onSelect: () => openCollision(strongestCollision?.lane.key ?? null, "overview"),
      disabled: current === "collision",
    },
    {
      id: "lenses",
      label: "Browse all six lenses",
      helper: "Pick another football question.",
      icon: DESTINATION_ICONS.lenses,
      onSelect: () => {
        setOrigin("overview");
        setView("lenses");
      },
      disabled: current === "lenses",
    },
  ];


  return (
    <AppShell showGuide={false}>
      <div className="space-y-3">
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
            <MatchupContextBar
              labelA={awayAbv}
              labelB={homeAbv}
              nameA={teamName(awayAbv)}
              nameB={teamName(homeAbv)}
              contextLine={`${snapshot.windowLabel} · as of ${snapshot.asOfDate}`}
              viewingLabel={viewingLabel}
              isOverview={view === "overview"}
              onBack={goOverview}
              onChangeMatchup={changeMatchup}
            />

            <p className="sr-only" role="status" aria-live="polite" data-testid="view-announcement">
              {announcement}
            </p>

            <div ref={canvasRef} className="space-y-3 scroll-mt-32">
              {view === "overview" && brief && (
                <>
                  <Card className="border-border bg-card" ref={selectorRef}>
                    <CardContent className="p-3">
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

                  <InsightTicker stories={stories} onOpen={openStory} />

                  <GameBrief
                    brief={brief}
                    onSelectLens={openLens}
                    onOpenCollision={openCollision}
                  />

                  <DestinationCards
                    destinations={destinations}
                    activeId={activeDestination}
                    onOpen={openDestination}
                  />
                </>
              )}

              {view === "constellation" && (
                <div className="space-y-3">
                  {backToOverview}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <LensConstellation
                        axes={axes}
                        labelA={awayAbv}
                        labelB={homeAbv}
                        nameA={teamName(awayAbv)}
                        nameB={teamName(homeAbv)}
                        selectedKey={selectedLens}
                        onSelect={openLens}
                        onHover={setHoveredLens}
                        layout={layout}
                        onLayoutChange={setLayout}
                      />
                    </CardContent>
                  </Card>
                </div>
              )}

              {view === "lens" && (
                <div className="space-y-3">
                  {backToOverview}
                  {evidence ?? (
                    <Card className="border-border bg-card">
                      <CardContent className="p-4 text-sm text-muted-foreground">
                        Select a lens to see its evidence.
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {view === "lenses" && (
                <div className="space-y-3">
                  {backToOverview}
                  <LensExplorer
                    gaps={gaps}
                    snapshot={snapshot}
                    teamAbvA={awayAbv}
                    teamAbvB={homeAbv}
                    labelA={awayAbv}
                    labelB={homeAbv}
                    selectedKey={selectedLens}
                    onSelect={openLens}
                  />
                </div>
              )}

              {view === "collision" && (
                <div className="space-y-3">
                  {backToOverview}
                  <MatchupCollision
                    directions={directions}
                    selectedKey={collisionKey}
                    onSelect={setCollisionKey}
                    onOpenTrace={openTrace}
                  />
                </div>
              )}

              {view === "gaps" && (
                <div className="space-y-3">
                  {backToOverview}
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
                    onSelect={openLens}
                  />
                </div>
              )}

              {view === "momentum" && momentum.eligible && (
                <div className="space-y-3">
                  {backToOverview}
                  <MomentumShift snapshots={[snapshot]} />
                </div>
              )}
            </div>

            <TraceDrawer
              trace={traceData}
              target={trace}
              snapshot={snapshot}
              open={trace !== null}
              onOpenChange={(open) => !open && setTrace(null)}
              onOpenTrace={openTrace}
              onSelectLens={(key) => {
                openLens(key);
                setTrace(null);
              }}
              selectedLensName={
                activeLens ? LENS_GLOSSARY[activeLens.key]?.name ?? activeLens.name : "no selected lens"
              }
              matchupLabel={`${awayAbv} vs ${homeAbv}`}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
