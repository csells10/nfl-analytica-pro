import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
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
import { MatchupMap, type MatchupMapOrder } from "@/components/matchup-lens/MatchupMap";
import { TeamFingerprint } from "@/components/matchup-lens/TeamFingerprint";
import { ComparisonSummary } from "@/components/matchup-lens/ComparisonSummary";
import { GameBrief } from "@/components/matchup-lens/GameBrief";
import { MatchupCollision } from "@/components/matchup-lens/MatchupCollision";
import { LensGalaxy } from "@/components/matchup-lens/LensGalaxy";
import { LensPortrait } from "@/components/matchup-lens/LensPortrait";
import { MomentumShift } from "@/components/matchup-lens/MomentumShift";
import { TraceDrawer } from "@/components/matchup-lens/TraceDrawer";
import {
  ExperienceLauncher,
  lensMode,
  type LensMode,
} from "@/components/matchup-lens/ExperienceLauncher";
import { getLensSnapshotSource } from "@/lib/matchup-lens-source";
import { lensGaps } from "@/lib/matchup-lens-compare";
import { collisionDirections } from "@/lib/matchup-lens-collision";
import { buildGameBrief } from "@/lib/matchup-lens-brief";
import { buildTrace, type TraceTarget } from "@/lib/matchup-lens-trace";
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
        className={`mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] ${
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

  const [awayAbv, setAwayAbv] = useState(() => snapshotAbbr(searchParams.get("a") ?? DEFAULT_AWAY));
  const [homeAbv, setHomeAbv] = useState(() => snapshotAbbr(searchParams.get("b") ?? DEFAULT_HOME));
  const [selectedLens, setSelectedLens] = useState(
    () => LENSES.find((lens) => lens.key === searchParams.get("lens"))?.key ?? LENSES[0].key,
  );
  const [hoveredLens, setHoveredLens] = useState<string | null>(null);
  const [mode, setMode] = useState<LensMode>(() => lensMode(searchParams.get("mode")));
  const [order, setOrder] = useState<MatchupMapOrder>("separation");
  const [collisionKey, setCollisionKey] = useState<string | null>(null);
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

  // Shared state lives in the URL so the matchup survives reload, back and share.
  useEffect(() => {
    const next = new URLSearchParams(searchParams);
    next.set("a", awayAbv);
    next.set("b", homeAbv);
    next.set("mode", mode);
    next.set("lens", selectedLens);
    if (trace) next.set("trace", `${trace.type}:${trace.id}`);
    else next.delete("trace");
    if (next.toString() !== searchParams.toString()) {
      setSearchParams(next, { replace: true });
    }
  }, [awayAbv, homeAbv, mode, selectedLens, trace, searchParams, setSearchParams]);

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

  const activeKey = mode === "constellation" ? (hoveredLens ?? selectedLens) : selectedLens;
  const activeLens = LENSES.find((lens) => lens.key === activeKey) ?? LENSES[0];
  const activeA = scoresA.find((score) => score.lensKey === activeLens.key);
  const activeB = scoresB.find((score) => score.lensKey === activeLens.key);

  const gaps = useMemo(() => lensGaps(scoresA, scoresB), [scoresA, scoresB]);
  const axes = LENSES.map((lens, index) => ({
    key: lens.key,
    name: lens.name,
    scoreA: scoresA[index]?.score ?? null,
    scoreB: scoresB[index]?.score ?? null,
  }));

  const directions = useMemo(
    () => (snapshot && away && home ? collisionDirections(snapshot, away, home) : []),
    [snapshot, away, home],
  );

  const brief = useMemo(
    () =>
      snapshot && away && home
        ? buildGameBrief(snapshot, away, home, awayAbv, homeAbv)
        : null,
    [snapshot, away, home, awayAbv, homeAbv],
  );

  const traceData = useMemo(
    () =>
      snapshot && away && home && trace
        ? buildTrace(snapshot, trace, selectedLens, [away, home])
        : null,
    [snapshot, away, home, trace, selectedLens],
  );

  const openTrace = useCallback((target: TraceTarget) => setTrace(target), []);
  const openCollision = useCallback((key: string) => {
    setCollisionKey(key);
    setMode("collision");
  }, []);

  const evidence =
    snapshot && away && home && activeA && activeB ? (
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

  return (
    <AppShell showGuide={false}>
      <div className="space-y-5">
        <header>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Matchup Lens</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Understand where two teams are strongest, where their styles collide, and what changed
            before kickoff.
          </p>
          <p className="mt-1 text-xs text-muted-foreground" data-testid="lens-context-label">
            {snapshot?.contextLabel ??
              "Preseason-to-date \u00b7 Aug 23, 2026 \u00b7 2\u20133 games \u00b7 comparison, not forecast."}
          </p>
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
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-end gap-3">
                  <TeamPicker
                    value={awayAbv}
                    options={teamOptions}
                    onChange={setAwayAbv}
                    role="Team A"
                    tone="a"
                  />
                  <span className="pb-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                <p className="mt-3 text-[11px] text-muted-foreground">
                  <span className="text-accent-cool">{teamName(awayAbv)}</span>
                  {" · "}
                  {away.gamesInWindow} games
                  {"  |  "}
                  <span className="text-primary">{teamName(homeAbv)}</span>
                  {" · "}
                  {home.gamesInWindow} games
                </p>
                <div className="mt-4">
                  <ExperienceLauncher value={mode} onChange={setMode} />
                </div>
              </CardContent>
            </Card>

            {mode !== "momentum" && (
              <ComparisonSummary
                gaps={gaps}
                labelA={awayAbv}
                labelB={homeAbv}
                onSelect={setSelectedLens}
              />
            )}

            {mode === "brief" && brief && (
              <div className="space-y-5">
                <GameBrief
                  brief={brief}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  nameA={teamName(awayAbv)}
                  nameB={teamName(homeAbv)}
                  onSelectLens={setSelectedLens}
                  onOpenCollision={openCollision}
                />
                {evidence}
              </div>
            )}

            {mode === "constellation" && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <Card className="border-border bg-card">
                  <CardContent className="p-4 sm:p-5">
                    <LensConstellation
                      axes={axes}
                      labelA={awayAbv}
                      labelB={homeAbv}
                      nameA={teamName(awayAbv)}
                      nameB={teamName(homeAbv)}
                      selectedKey={selectedLens}
                      onSelect={setSelectedLens}
                      onHover={setHoveredLens}
                    />
                  </CardContent>
                </Card>
                {evidence}
              </div>
            )}

            {mode === "collision" && (
              <div className="space-y-5">
                <MatchupCollision
                  directions={directions}
                  selectedKey={collisionKey}
                  onSelect={setCollisionKey}
                  onOpenTrace={openTrace}
                />
                {evidence}
              </div>
            )}

            {mode === "fingerprint" && (
              <div className="space-y-5">
                <TeamFingerprint
                  axes={axes}
                  snapshot={snapshot}
                  teamAbvA={awayAbv}
                  teamAbvB={homeAbv}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  nameA={teamName(awayAbv)}
                  nameB={teamName(homeAbv)}
                  selectedKey={selectedLens}
                  onSelect={setSelectedLens}
                  selectedGap={gaps.find((gap) => gap.key === activeLens.key)}
                />
                {evidence}
              </div>
            )}

            {mode === "map" && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <MatchupMap
                  gaps={gaps}
                  snapshot={snapshot}
                  teamAbvA={awayAbv}
                  teamAbvB={homeAbv}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  nameA={teamName(awayAbv)}
                  nameB={teamName(homeAbv)}
                  selectedKey={selectedLens}
                  onSelect={setSelectedLens}
                  order={order}
                  onOrderChange={setOrder}
                />
                {evidence}
              </div>
            )}

            {mode === "galaxy" && activeA && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <LensGalaxy
                  lens={activeLens}
                  score={activeA}
                  teamLabel={awayAbv}
                  onOpenTrace={openTrace}
                />
                {evidence}
              </div>
            )}

            {mode === "portrait" && activeA && activeB && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                <LensPortrait
                  lens={activeLens}
                  snapshot={snapshot}
                  scoreA={activeA}
                  scoreB={activeB}
                  teamAbvA={awayAbv}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  onOpenTrace={openTrace}
                />
                {evidence}
              </div>
            )}

            {mode === "momentum" && <MomentumShift snapshots={[snapshot]} />}

            <TraceDrawer
              trace={traceData}
              open={trace !== null}
              onOpenChange={(open) => !open && setTrace(null)}
              onOpenTrace={openTrace}
              onSelectLens={(key) => {
                setSelectedLens(key);
                setTrace(null);
              }}
              selectedLensName={activeLens.name}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}
