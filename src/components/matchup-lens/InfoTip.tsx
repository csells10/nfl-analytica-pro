import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Info } from "lucide-react";

interface InfoTipProps {
  /** What the tip explains; used for the accessible button name. */
  label: string;
  children: ReactNode;
  /** Overrides the default info glyph, e.g. "Why this appears". */
  triggerLabel?: string;
  align?: "left" | "right";
}

/**
 * One tooltip/disclosure used everywhere meaning must stay one action away.
 * It opens on hover and keyboard focus, has an explicit button for touch,
 * renders below the trigger so the label stays readable, and closes on Escape
 * or an outside click.
 */
export function InfoTip({ label, children, triggerLabel, align = "left" }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const tipId = useId();
  const wrapper = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!wrapper.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onPointer);
    };
  }, [open]);

  return (
    <span
      ref={wrapper}
      className="relative inline-flex"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        data-testid="info-tip-trigger"
        aria-label={`${triggerLabel ?? "About"}: ${label}`}
        aria-expanded={open}
        aria-controls={open ? tipId : undefined}
        onClick={(event) => {
          event.stopPropagation();
          setOpen((value) => !value);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`inline-flex items-center gap-1 rounded-md border border-transparent text-[11px] font-medium text-muted-foreground transition-colors hover:border-border hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
          triggerLabel ? "min-h-[44px] px-2 py-1 sm:min-h-0 sm:py-1.5" : "h-11 w-11 justify-center sm:h-7 sm:w-7"
        }`}
      >
        <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        {triggerLabel && <span>{triggerLabel}</span>}
      </button>
      {open && (
        <span
          id={tipId}
          role="tooltip"
          data-testid="info-tip-content"
          className={`absolute top-full z-40 mt-1 w-64 rounded-md border border-border bg-popover p-2.5 text-[11px] leading-relaxed text-popover-foreground shadow-lg ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {children}
        </span>
      )}
    </span>
  );
}
