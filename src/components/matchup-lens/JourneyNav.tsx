import { ArrowLeft, ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface JourneyStep {
  id: string;
  label: string;
  helper: string;
  icon: LucideIcon;
  onSelect: () => void;
  disabled?: boolean;
}

interface JourneyNavProps {
  /** Single contextual return action — never paired with a second back button. */
  backLabel: string;
  onBack: () => void;
  /** Optional "Viewing: …" lens switcher shown on focused Lens detail. */
  lensSelector?: {
    value: string;
    options: { key: string; name: string }[];
    onChange: (key: string) => void;
    onPrev: () => void;
    onNext: () => void;
  };
}

export function JourneyBack({ backLabel, onBack, lensSelector }: JourneyNavProps) {
  return (
    <div className="flex flex-wrap items-center gap-2" data-testid="journey-nav">
      <button
        type="button"
        data-testid="journey-back"
        onClick={onBack}
        className="inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
        {backLabel}
      </button>

      {lensSelector && (
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="text-[11px] font-medium text-muted-foreground">Viewing</span>
          <Select value={lensSelector.value} onValueChange={lensSelector.onChange}>
            <SelectTrigger
              className="h-11 w-[13.5rem] sm:h-9"
              aria-label="Viewing lens"
              data-testid="journey-lens-select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {lensSelector.options.map((option) => (
                <SelectItem key={option.key} value={option.key}>
                  {option.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            type="button"
            aria-label="Previous lens"
            data-testid="journey-prev-lens"
            onClick={lensSelector.onPrev}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Next lens"
            data-testid="journey-next-lens"
            onClick={lensSelector.onNext}
            className="flex h-11 w-11 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:border-primary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:h-9 sm:w-9"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  );
}

/** One to three meaningful next paths, shown after the evidence. */
export function ContinueExploring({ steps }: { steps: JourneyStep[] }) {
  const available = steps.filter((step) => !step.disabled);
  if (available.length === 0) return null;
  return (
    <section
      aria-label="Continue exploring"
      data-testid="continue-exploring"
      className="rounded-lg border border-border bg-card p-3"
    >
      <h3 className="text-xs font-semibold tracking-tight text-foreground">Continue exploring</h3>
      <div className="mt-2 grid gap-2 sm:grid-cols-3">
        {available.map((step) => {
          const Icon = step.icon;
          return (
            <button
              key={step.id}
              type="button"
              data-testid={`continue-${step.id}`}
              onClick={step.onSelect}
              className="flex min-h-[44px] cursor-pointer items-start gap-2 rounded-md border border-border bg-secondary/40 p-2.5 text-left transition-colors hover:border-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[11px] font-semibold text-foreground">
                  {step.label} →
                </span>
                <span className="mt-0.5 block text-[11px] leading-relaxed text-muted-foreground">
                  {step.helper}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
