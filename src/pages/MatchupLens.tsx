import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import AppShell from "@/components/AppShell";
import { Card, CardContent } from "@/components/ui/card";
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
  LENS_STATE_COPY,
} from "@/components/matchup-lens/DashboardStates";
import { TopProfileGaps } from "@/components/matchup-lens/TopProfileGaps";
import { GameBrief } from "@/components/matchup-lens/GameBrief";
import { MatchupCollision } from "@/components/matchup-lens/MatchupCollision";
import { MomentumShift } from "@/components/matchup-lens/MomentumShift";
import { TraceDrawer } from "@/components/matchup-lens/TraceDrawer";
import { classifyGameId, useMatchupLensContext } from "@/lib/matchup-lens-live";
import type { MatchupLensLensReadiness } from "@/lib/matchup-lens-adapter";
import {
  LensPresentationProvider,
  LEAGUE_CONTEXT_SUPPRESSED_NOTE,
} from "@/lib/matchup-lens-presentation";
import { ApiError } from "@/lib/nfl-api";
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

/** Live evidence uses WSH; the shared team registry uses WAS. */
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

/**
 * Canonical matchup identity. Teams come from the backend game header, so this
 * is read-only: the URL cannot select or change which teams are compared.
 */
function TeamIdentity({ value, role, tone }: { value: string; role: string; tone: "a" | "b" }) {
  return (
    <div className="min-w-0 flex-1" data-testid={`canonical-team-${tone}`}>
      <p
        className={`mb-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${
          tone === "a" ? "text-accent-cool" : "text-primary"
        }`}
      >
        {role}
      </p>
      <div className="flex min-h-[44px] min-w-0 items-center gap-2 rounded-md border border-border bg-muted/10 px-3">
        <img
          src={teamLogoUrl(registryAbbr(value), 500)}
          alt=""
          className="h-5 w-5 shrink-0"
          loading="lazy"
        />
        <span className="truncate text-sm font-semibold text-foreground">
          {value} · {getTeam(registryAbbr(value)).shortName}
        </span>
      </div>
    </div>
  );
}

interface UrlState {
  awayAbv: string;
  homeAbv: string;
  view: LensView;
  origin: LensOrigin;
  layout: ConstellationLayout;
  selectedLens: string | null;
  collisionKey: string | null;
  trace: TraceTarget | null;
}

function parseTrace(raw: string | null): TraceTarget | null {
  if (!raw) return null;
  const [type, ...rest] = raw.split(":");
  if ((type === "tag" || type === "metric") && rest.length > 0) {
    return { type, id: rest.join(":") };
  }
  return null;
}

/** Read every piece of dashboard state out of the URL. */
function readUrlState(params: URLSearchParams): UrlState {
  const parsed = parseView(params.get("view"), params.get("mode"));
  return {
    // Display continuity only. Canonical teams come from the live response.
    awayAbv: snapshotAbbr(params.get("a") ?? ""),
    homeAbv: snapshotAbbr(params.get("b") ?? ""),
    view: parsed.view,
    origin: parseOrigin(params.get("from")),
    layout: parseLayout(params.get("layout"), parsed.layout),
    selectedLens: LENSES.find((lens) => lens.key === params.get("lens"))?.key ?? null,
    collisionKey: params.get("collision"),
    trace: parseTrace(params.get("trace")),
  };
}

/** Write dashboard state back into a params object, leaving other keys alone. */
function writeUrlState(params: URLSearchParams, state: UrlState): URLSearchParams {
  params.delete("mode");
  if (state.awayAbv) params.set("a", state.awayAbv);
  else params.delete("a");
  if (state.homeAbv) params.set("b", state.homeAbv);
  else params.delete("b");
  params.set("view", state.view);
  if (state.view === "overview") params.delete("from");
  else params.set("from", state.origin);
  if (state.view === "constellation" && state.layout === "side") params.set("layout", "side");
  else params.delete("layout");
  if (state.selectedLens) params.set("lens", state.selectedLens);
  else params.delete("lens");
  if (state.collisionKey) params.set("collision", state.collisionKey);
  else params.delete("collision");
  if (state.trace) params.set("trace", `${state.trace.type}:${state.trace.id}`);
  else params.delete("trace");
  return params;
}

export default function MatchupLens() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // The game identifier is the evidence identity. There is no fallback
  // snapshot: without a valid game nothing is requested and nothing is scored.
  const gameIdState = useMemo(() => classifyGameId(searchParams.get("game")), [searchParams]);
  const gameId = gameIdState.kind === "valid" ? gameIdState.gameId : null;

  const {
    data: result,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useMatchupLensContext(gameId);

  const context = result?.kind === "available" ? result.context : null;
  const snapshot = context?.snapshot;
  const suppressLeagueContext = context?.leagueContext.suppressed ?? false;

  const readinessByLens = useMemo(() => {
    const map: Record<string, MatchupLensLensReadiness> = {};
    for (const row of context?.coverage.lensReadiness ?? []) map[row.lensKey] = row;
    return map;
  }, [context]);

  // The URL is the single source of truth, so browser Back/Forward rehydrates
  // the whole canvas and no local mirror can drift out of sync.
  const urlState = useMemo(() => readUrlState(searchParams), [searchParams]);
  const { view, origin, layout, selectedLens, collisionKey, trace } = urlState;

  // Canonical identity wins over anything carried in the URL.
  const awayAbv = context ? snapshotAbbr(context.game.away.teamAbv) : urlState.awayAbv;
  const homeAbv = context ? snapshotAbbr(context.game.home.teamAbv) : urlState.homeAbv;

  /**
   * User-initiated transitions push a history entry; internal normalization
   * replaces so invalid deep links never create history spam.
   */
  const commit = useCallback(
    (patch: Partial<UrlState>, options: { replace?: boolean } = {}) => {
      const next = writeUrlState(new URLSearchParams(searchParams), { ...urlState, ...patch });
      if (next.toString() === searchParams.toString()) return;
      setSearchParams(next, { replace: options.replace ?? false });
    },
    [searchParams, setSearchParams, urlState],
  );

  const [hoveredLens, setHoveredLens] = useState<string | null>(null);

  const canvasRef = useRef<HTMLDivElement>(null);
  const selectorRef = useRef<HTMLDivElement>(null);

  // Canonical rows, not URL-selected rows.
  const away = snapshot && context ? findTeam(snapshot, context.game.away.teamAbv) : undefined;
  const home = snapshot && context ? findTeam(snapshot, context.game.home.teamAbv) : undefined;

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

  const momentum = useMemo(() => momentumReadiness(snapshot ? [snapshot] : []), [snapshot]);

  const laneKeys = useMemo(
    () => new Set(directions.flatMap((direction) => direction.lanes.map((lane) => lane.key))),
    [directions],
  );

  const traceData = useMemo(
    () =>
      snapshot && away && home && trace
        ? buildTrace(snapshot, trace, selectedLens ?? LENSES[0].key, [away, home])
        : null,
    [snapshot, away, home, trace, selectedLens],
  );

  /**
   * Deep-link hygiene. Every invalid or unavailable value is normalised in one
   * place and written back with `replace`, so history only holds real steps.
   */
  useEffect(() => {
    if (!snapshot) return;
    const canonical: UrlState = { ...urlState };

    // `a` and `b` are display/share continuity only; they are rewritten to the
    // canonical response teams and can never select different rows.
    canonical.awayAbv = awayAbv;
    canonical.homeAbv = homeAbv;

    // Momentum needs comparable history; without it the view is unreachable.
    if (canonical.view === "momentum" && !momentum.eligible) {
      canonical.view = "overview";
      canonical.origin = "overview";
    }

    // A collision lane that does not exist for this matchup is dropped.
    if (canonical.collisionKey && laneKeys.size > 0 && !laneKeys.has(canonical.collisionKey)) {
      canonical.collisionKey = null;
    }

    // A trace whose metric or tag has no evidence in this snapshot would open
    // an empty drawer, so the parameter is dropped rather than rendered.
    if (canonical.trace && !traceData) {
      canonical.trace = null;
    }

    const next = writeUrlState(new URLSearchParams(searchParams), canonical);
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [
    snapshot,
    urlState,
    awayAbv,
    homeAbv,
    momentum.eligible,
    laneKeys,
    traceData,
    searchParams,
    setSearchParams,
  ]);

  const brief = useMemo(
    () =>
      snapshot && away && home
        ? buildGameBrief(
            snapshot,
            away,
            home,
            awayAbv,
            homeAbv,
            teamName(awayAbv),
            teamName(homeAbv),
            { suppressLeagueContext },
          )
        : null,
    [snapshot, away, home, awayAbv, homeAbv, suppressLeagueContext],
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
            suppressLeagueContext,
          })
        : [],
    [snapshot, away, home, awayAbv, homeAbv, gaps, angle, directions, suppressLeagueContext],
  );

  const openTrace = useCallback((target: TraceTarget) => commit({ trace: target }), [commit]);
  const closeTrace = useCallback(() => commit({ trace: null }), [commit]);

  /** Every selection replaces the canvas with a focused view. */
  const openLens = useCallback(
    (key: string, from: LensOrigin = "overview") =>
      commit({ selectedLens: key, origin: from, view: "lens" }),
    [commit],
  );

  const openCollision = useCallback(
    (key: string | null, from: LensOrigin = "overview") =>
      commit({ collisionKey: key, origin: from, view: "collision" }),
    [commit],
  );

  const openView = useCallback(
    (next: LensView, from: LensOrigin = "overview") => commit({ view: next, origin: from }),
    [commit],
  );

  /**
   * Any real team change is a new matchup: return to the Overview and clear
   * every focused, hovered or traced state carried over from the old one.
   */
  const resetToOverview = useCallback(
    (patch: Partial<UrlState> = {}) => {
      setHoveredLens(null);
      commit({
        view: "overview",
        origin: "overview",
        layout: "overlay",
        selectedLens: null,
        collisionKey: null,
        trace: null,
        ...patch,
      });
    },
    [commit],
  );

  /**
   * A new game is a new matchup: clear every focused, hovered or traced state
   * carried over from the previous one before its evidence can render.
   */
  const previousGameId = useRef<string | null>(gameId);
  useEffect(() => {
    if (previousGameId.current === gameId) return;
    previousGameId.current = gameId;
    setHoveredLens(null);
    const next = writeUrlState(new URLSearchParams(searchParams), {
      ...urlState,
      awayAbv: "",
      homeAbv: "",
      view: "overview",
      origin: "overview",
      layout: "overlay",
      selectedLens: null,
      collisionKey: null,
      trace: null,
    });
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
  }, [gameId, searchParams, setSearchParams, urlState]);



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
      if (id === "constellation") openView("constellation");
      else if (id === "lenses") openView("lenses");
      else if (id === "biggest-edge" && largestGapKey) openLens(largestGapKey, "biggest-edge");
      else if (id === "collision") openCollision(strongestCollision?.lane.key ?? null, "overview");
    },
    [largestGapKey, openCollision, openLens, openView, strongestCollision],
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

  // Hover is view-only state: never carry it across a view or matchup change.
  useEffect(() => {
    setHoveredLens(null);
  }, [view, awayAbv, homeAbv]);


  // Focused views take over the top of the canvas and are announced politely.
  const [announcement, setAnnouncement] = useState("");
  useEffect(() => {
    setAnnouncement(`Viewing ${viewingLabel} for ${awayAbv} versus ${homeAbv}.`);
    if (view === "overview") return;
    canvasRef.current?.scrollIntoView?.({ block: "start", behavior: "auto" });
  }, [viewingLabel, view, awayAbv, homeAbv]);

  const goOverview = useCallback(() => openView("overview"), [openView]);

  /** One contextual return: back to wherever this view was entered from. */
  const goBack = useCallback(
    () => openView(originReturn(origin).view),
    [openView, origin],
  );

  // Evidence is per game, so changing matchup means choosing another game.
  const goToSlate = useCallback(() => navigate("/"), [navigate]);
  const changeMatchup = goToSlate;

  /** Plain-language failure copy per typed error kind. Never raw error text. */
  const failure = useMemo(() => {
    const kind = error instanceof ApiError ? error.kind : "unknown";
    switch (kind) {
      case "invalid-request":
        return { ...LENS_STATE_COPY.malformedGame, retryable: false as const };
      case "forbidden":
        return { ...LENS_STATE_COPY.accessDenied, action: undefined, retryable: false as const };
      case "not-found":
        return { ...LENS_STATE_COPY.unknownGame, retryable: false as const };
      case "conflict":
        return { ...LENS_STATE_COPY.conflict, retryable: false as const };
      case "invalid-response":
        return { ...LENS_STATE_COPY.invalidResponse, action: undefined, retryable: false as const };
      case "timeout":
        return { ...LENS_STATE_COPY.timeout, action: undefined, retryable: true as const };
      default:
        return {
          title: undefined,
          message: undefined,
          action: undefined,
          retryable: true as const,
        };
    }
  }, [error]);

  /** One concise disclosure line each, shown once in the context area. */
  const contextNotices = useMemo(() => {
    const notes: string[] = [];
    const uneven = (context?.coverage.lensReadiness ?? []).filter(
      (row) => row.status !== "complete",
    );
    if (uneven.length > 0) {
      notes.push(
        `Evidence is uneven for ${uneven
          .map((row) => row.lensName ?? row.lensKey)
          .join(", ")}. Each score uses only the values present — nothing is counted as zero.`,
      );
    }
    if (suppressLeagueContext) notes.push(LEAGUE_CONTEXT_SUPPRESSED_NOTE);
    return notes;
  }, [context, suppressLeagueContext]);


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
    commit({ selectedLens: LENSES[next].key });
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
              onChange: (key) => commit({ selectedLens: key }),
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
      onSelect: () => openView("constellation"),
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
      onSelect: () => openView("lenses"),
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

        {gameIdState.kind === "missing" ? (
          <DashboardEmpty
            title={LENS_STATE_COPY.noGame.title}
            message={LENS_STATE_COPY.noGame.message}
            actionLabel={LENS_STATE_COPY.noGame.action}
            onAction={goToSlate}
          />
        ) : gameIdState.kind === "malformed" ? (
          <DashboardEmpty
            title={LENS_STATE_COPY.malformedGame.title}
            message={LENS_STATE_COPY.malformedGame.message}
            actionLabel={LENS_STATE_COPY.malformedGame.action}
            onAction={goToSlate}
          />
        ) : isLoading ? (
          <DashboardSkeleton />
        ) : isError ? (
          failure.retryable ? (
            <DashboardError
              onRetry={() => void refetch()}
              title={failure.title}
              message={failure.message}
            />
          ) : (
            <DashboardEmpty
              title={failure.title}
              message={failure.message}
              actionLabel={failure.action}
              onAction={failure.action ? goToSlate : undefined}
            />
          )
        ) : result?.kind === "unavailable" ? (
          <DashboardEmpty
            title={LENS_STATE_COPY.unavailable.title}
            message={result.reason ?? LENS_STATE_COPY.unavailable.message}
            actionLabel={LENS_STATE_COPY.unavailable.action}
            onAction={goToSlate}
          />
        ) : !snapshot || !away || !home ? (
          <DashboardEmpty
            title={LENS_STATE_COPY.invalidResponse.title}
            message={LENS_STATE_COPY.invalidResponse.message}
          />
        ) : (
          <LensPresentationProvider value={{ suppressLeagueContext }}>
            <MatchupContextBar
              labelA={awayAbv}
              labelB={homeAbv}
              nameA={teamName(awayAbv)}
              nameB={teamName(homeAbv)}
              contextLine={`${snapshot.windowLabel} · as of ${snapshot.asOfDate}`}
              viewingLabel={viewingLabel}
              isOverview={view === "overview"}
              isRefreshing={isFetching && !isLoading}
              notices={contextNotices}
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
                        <TeamIdentity value={awayAbv} role="Away" tone="a" />
                        <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:pb-3">
                          at
                        </span>
                        <TeamIdentity value={homeAbv} role="Home" tone="b" />
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

                  {stories.length > 0 ? (
                    <InsightTicker stories={stories} onOpen={openStory} />
                  ) : (
                    <DashboardEmpty
                      title="No stories stand out yet"
                      message="These two profiles are close enough that nothing separates them in this window. The lens evidence below still works."
                    />
                  )}

                  <GameBrief
                    brief={brief}
                    onSelectLens={(key) => openLens(key, "brief")}
                    onOpenCollision={(key) => openCollision(key, "brief")}
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
                  {journeyBack()}
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <LensConstellation
                        axes={axes}
                        labelA={awayAbv}
                        labelB={homeAbv}
                        nameA={teamName(awayAbv)}
                        nameB={teamName(homeAbv)}
                        selectedKey={selectedLens}
                        onSelect={(key) => openLens(key, "constellation")}
                        onHover={setHoveredLens}
                        layout={layout}
                        onLayoutChange={(next) => commit({ layout: next })}
                      />
                    </CardContent>
                  </Card>
                  <ContinueExploring steps={continueSteps("constellation")} />
                </div>
              )}

              {view === "lens" && (
                <div className="space-y-3">
                  {journeyBack(true)}
                  {evidence ?? (
                    <DashboardEmpty
                      title="No lens selected"
                      message="Choose a lens to see the metrics behind it."
                      actionLabel="Browse all six lenses"
                      onAction={() => openView("lenses")}
                    />
                  )}
                  <ContinueExploring steps={continueSteps("lens")} />
                </div>
              )}

              {view === "lenses" && (
                <div className="space-y-3">
                  {journeyBack()}
                  <LensExplorer
                    gaps={gaps}
                    snapshot={snapshot}
                    teamAbvA={awayAbv}
                    teamAbvB={homeAbv}
                    labelA={awayAbv}
                    labelB={homeAbv}
                    selectedKey={selectedLens}
                    onSelect={(key) => openLens(key, "all-lenses")}
                  />
                  <ContinueExploring steps={continueSteps("lenses")} />
                </div>
              )}

              {view === "collision" && (
                <div className="space-y-3">
                  {journeyBack()}
                  <MatchupCollision
                    directions={directions}
                    selectedKey={collisionKey}
                    onSelect={(key) => commit({ collisionKey: key })}
                    onOpenTrace={openTrace}
                  />
                  <ContinueExploring steps={continueSteps("collision")} />
                </div>
              )}

              {view === "gaps" && (
                <div className="space-y-3">
                  {journeyBack()}
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
                    onSelect={(key) => openLens(key, "overview")}
                  />
                  <ContinueExploring steps={continueSteps("gaps")} />
                </div>
              )}

              {view === "momentum" && momentum.eligible && (
                <div className="space-y-3">
                  {journeyBack()}
                  <MomentumShift snapshots={[snapshot]} />
                </div>
              )}

            </div>

            <TraceDrawer
              trace={traceData}
              target={trace}
              snapshot={snapshot}
              open={trace !== null}
              onOpenChange={(open) => !open && closeTrace()}
              onOpenTrace={openTrace}
              onSelectLens={(key) => {
                commit({ selectedLens: key, origin: "overview", view: "lens", trace: null });
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
