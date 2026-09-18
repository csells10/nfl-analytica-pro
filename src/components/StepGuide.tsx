import { useEffect, useRef, useState } from "react";
import { Sparkles, X } from "lucide-react";

export interface StepGuideStep {
  title: string;
  body: string;
}

interface StepGuideProps {
  open: boolean;
  /** Short label shown above the step title, e.g. "Matchups". */
  eyebrow: string;
  steps: StepGuideStep[];
  /** Called for Finish, Skip, Close and Escape. Marks the guide as seen. */
  onDismiss: () => void;
  testId?: string;
}

/**
 * Small shared step-through guide used by the Matchups and Matchup Lab
 * guides. No remote state: the caller owns the localStorage key.
 */
export default function StepGuide({ open, eyebrow, steps, onDismiss, testId = "step-guide" }: StepGuideProps) {
  const [index, setIndex] = useState(0);
  const dialogRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onDismiss();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      returnFocusRef.current?.focus?.();
    };
  }, [open, onDismiss]);

  if (!open || steps.length === 0) return null;

  const step = steps[Math.min(index, steps.length - 1)];
  const isLast = index >= steps.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center p-4 sm:items-center" data-testid={testId}>
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onDismiss} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`${eyebrow} guide`}
        tabIndex={-1}
        className="relative w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl outline-none motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95"
      >
        <div className="mb-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
            {eyebrow}
          </span>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Close guide"
            className="rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h2 className="text-base font-semibold tracking-tight text-foreground">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs text-muted-foreground" data-testid={`${testId}-progress`}>
            Step {index + 1} of {steps.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Skip
            </button>
            <button
              type="button"
              onClick={() => (isLast ? onDismiss() : setIndex((i) => i + 1))}
              className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
