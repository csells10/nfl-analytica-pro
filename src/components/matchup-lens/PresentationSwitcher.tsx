import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

export type PresentationMode = "constellation" | "advantage" | "fingerprint";

export const PRESENTATION_MODES: { value: PresentationMode; label: string; hint: string }[] = [
  { value: "constellation", label: "Constellation", hint: "Overlaid six-axis radar" },
  { value: "advantage", label: "Advantage Map", hint: "Ranked lens-by-lens gaps" },
  { value: "fingerprint", label: "Team Fingerprint", hint: "Side-by-side team shapes" },
];

interface PresentationSwitcherProps {
  value: PresentationMode;
  onChange: (value: PresentationMode) => void;
}

/**
 * Three ways to read the same scores. Radix ToggleGroup gives arrow-key
 * navigation and pressed state for free.
 */
export function PresentationSwitcher({ value, onChange }: PresentationSwitcherProps) {
  const active = PRESENTATION_MODES.find((mode) => mode.value === value);

  return (
    <div>
      <ToggleGroup
        type="single"
        value={value}
        onValueChange={(next) => next && onChange(next as PresentationMode)}
        className="grid w-full grid-cols-3 gap-1 rounded-lg border border-border bg-card p-1"
        aria-label="Presentation mode"
      >
        {PRESENTATION_MODES.map((mode) => (
          <ToggleGroupItem
            key={mode.value}
            value={mode.value}
            aria-label={mode.label}
            className="h-9 rounded-md px-2 text-[11px] font-semibold tracking-tight data-[state=on]:bg-secondary data-[state=on]:text-foreground sm:text-xs"
          >
            {mode.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {active && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">{active.hint}</p>
      )}
    </div>
  );
}
