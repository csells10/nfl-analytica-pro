import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { EventPulse } from "@/components/matchup-lens/EventPulse";
import { AdvantageMap, type AdvantageOrder } from "@/components/matchup-lens/AdvantageMap";
import { TeamFingerprint } from "@/components/matchup-lens/TeamFingerprint";
import { ComparisonSummary } from "@/components/matchup-lens/ComparisonSummary";
import {
  PresentationSwitcher,
  type PresentationMode,
} from "@/components/matchup-lens/PresentationSwitcher";
import { getLensSnapshotSource } from "@/lib/matchup-lens-source";
import { lensGaps } from "@/lib/matchup-lens-compare";
import {
  LENSES,
  eventPulseForTeam,
  findTeam,
  scoreAllLenses,
} from "@/lib/matchup-lens";
import { getTeam, teamLogoUrl } from "@/lib/nfl-teams";


const DEFAULT_AWAY = "LAR";
const DEFAULT_HOME = "CLE";

/** The snapshot uses WSH; the shared team registry uses WAS. */
function registryAbbr(teamAbv: string): string {
  return teamAbv === "WSH" ? "WAS" : teamAbv;
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

  const [awayAbv, setAwayAbv] = useState(DEFAULT_AWAY);
  const [homeAbv, setHomeAbv] = useState(DEFAULT_HOME);
  const [selectedLens, setSelectedLens] = useState(LENSES[0].key);
  const [hoveredLens, setHoveredLens] = useState<string | null>(null);
  const [mode, setMode] = useState<PresentationMode>("constellation");
  const [order, setOrder] = useState<AdvantageOrder>("separation");

  const teamOptions = useMemo(
    () => (snapshot ? snapshot.teams.map((team) => team.teamAbv).sort() : []),
    [snapshot],
  );

  useEffect(() => {
    if (awayAbv === homeAbv && teamOptions.length > 1) {
      const next = teamOptions.find((abv) => abv !== awayAbv);
      if (next) setHomeAbv(next);
    }
  }, [awayAbv, homeAbv, teamOptions]);

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

  const activeKey = mode === "constellation" ? hoveredLens ?? selectedLens : selectedLens;
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

  return (
    <AppShell showGuide={false}>
      <div className="space-y-5">
        <header>
          <h1 className="text-xl font-bold tracking-tight text-foreground">Matchup Lens</h1>
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
                  <PresentationSwitcher value={mode} onChange={setMode} />
                </div>
              </CardContent>
            </Card>

            <ComparisonSummary
              gaps={gaps}
              labelA={awayAbv}
              labelB={homeAbv}
              onSelect={setSelectedLens}
            />

            {mode === "fingerprint" ? (
              <div className="space-y-5">
                <TeamFingerprint
                  axes={axes}
                  labelA={awayAbv}
                  labelB={homeAbv}
                  selectedKey={selectedLens}
                  onSelect={setSelectedLens}
                  selectedGap={gaps.find((gap) => gap.key === activeLens.key)}
                />
                {activeA && activeB && (
                  <LensDetail
                    lens={activeLens}
                    scoreA={activeA}
                    scoreB={activeB}
                    labelA={awayAbv}
                    labelB={homeAbv}
                  />
                )}
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                {mode === "constellation" ? (
                  <Card className="border-border bg-card">
                    <CardContent className="p-4 sm:p-5">
                      <LensConstellation
                        axes={axes}
                        labelA={awayAbv}
                        labelB={homeAbv}
                        selectedKey={selectedLens}
                        onSelect={setSelectedLens}
                        onHover={setHoveredLens}
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <AdvantageMap
                    gaps={gaps}
                    labelA={awayAbv}
                    labelB={homeAbv}
                    selectedKey={selectedLens}
                    onSelect={setSelectedLens}
                    order={order}
                    onOrderChange={setOrder}
                  />
                )}

                {activeA && activeB && (
                  <LensDetail
                    lens={activeLens}
                    scoreA={activeA}
                    scoreB={activeB}
                    labelA={awayAbv}
                    labelB={homeAbv}
                  />
                )}
              </div>
            )}

            <EventPulse
              entriesA={eventPulseForTeam(snapshot, away)}
              entriesB={eventPulseForTeam(snapshot, home)}
              labelA={awayAbv}
              labelB={homeAbv}
            />
          </>
        )}
      </div>
    </AppShell>
  );
}

