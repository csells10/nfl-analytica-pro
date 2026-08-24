import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export type LensMode =
  | "brief"
  | "constellation"
  | "collision"
  | "fingerprint"
  | "map"
  | "galaxy"
  | "portrait"
  | "momentum";

export interface LensModeDefinition {
  value: LensMode;
  label: string;
  group: string;
  /** Shown as "This answers…" wherever the mode is active. */
  answers: string;
}

export const LENS_MODE_GROUPS = [
  "Before kickoff",
  "Understand the teams",
  "Explore the system",
  "Change over time",
] as const;

export const LENS_MODES: LensModeDefinition[] = [
  {
    value: "brief",
    label: "Game Brief",
    group: "Before kickoff",
    answers: "What should I know about this matchup before kickoff?",
  },
  {
    value: "constellation",
    label: "Constellation",
    group: "Before kickoff",
    answers: "How do both team profiles overlap across all six lenses at once?",
  },
  {
    value: "collision",
    label: "Matchup Collision",
    group: "Before kickoff",
    answers: "Where do one team's strengths run directly into the other's?",
  },
  {
    value: "fingerprint",
    label: "Team Fingerprint",
    group: "Understand the teams",
    answers: "What kind of team is each one, on its own terms?",
  },
  {
    value: "map",
    label: "Matchup Map",
    group: "Understand the teams",
    answers: "Where is the matchup most different, lens by lens on one shared scale?",
  },
  {
    value: "galaxy",
    label: "Lens Galaxy",
    group: "Explore the system",
    answers: "How is this lens constructed and connected?",
  },
  {
    value: "portrait",
    label: "Lens Portrait",
    group: "Explore the system",
    answers: "What is this lens made of, and what matters most inside it?",
  },
  {
    value: "momentum",
    label: "Momentum Shift",
    group: "Change over time",
    answers: "What has changed between two comparable windows?",
  },
];

export function lensMode(value: string | null): LensMode {
  const found = LENS_MODES.find((mode) => mode.value === value);
  return found ? found.value : "constellation";
}

interface ExperienceLauncherProps {
  value: LensMode;
  onChange: (value: LensMode) => void;
}

/**
 * Grouped launcher instead of one cramped tab row: a compact select on phones,
 * purpose-grouped buttons from small screens up.
 */
export function ExperienceLauncher({ value, onChange }: ExperienceLauncherProps) {
  const active = LENS_MODES.find((mode) => mode.value === value) ?? LENS_MODES[1];

  return (
    <div data-testid="experience-launcher">
      {/* Phones: one control, no horizontal crush. */}
      <div className="sm:hidden">
        <Select value={value} onValueChange={(next) => onChange(next as LensMode)}>
          <SelectTrigger className="h-11 w-full" aria-label="Experience">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {LENS_MODE_GROUPS.map((group) => (
              <SelectGroup key={group}>
                <SelectLabel className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                  {group}
                </SelectLabel>
                {LENS_MODES.filter((mode) => mode.group === group).map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    {mode.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Small screens and up: grouped by user purpose. */}
      <div className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
        {LENS_MODE_GROUPS.map((group) => (
          <div key={group} className="min-w-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {group}
            </p>
            <div
              role="group"
              aria-label={group}
              className="flex flex-col gap-1 rounded-lg border border-border bg-card p-1"
            >
              {LENS_MODES.filter((mode) => mode.group === group).map((mode) => {
                const isActive = mode.value === value;
                return (
                  <button
                    key={mode.value}
                    type="button"
                    onClick={() => onChange(mode.value)}
                    aria-pressed={isActive}
                    data-mode={mode.value}
                    className={`rounded-md px-2.5 py-2 text-left text-xs font-semibold transition-colors ${
                      isActive
                        ? "bg-secondary text-foreground"
                        : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="mt-2 text-xs text-muted-foreground" data-testid="mode-answers">
        <span className="font-semibold text-foreground">This answers:</span> {active.answers}
      </p>
    </div>
  );
}
