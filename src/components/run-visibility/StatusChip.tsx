import { AlertTriangle, Check, CircleSlash, Clock, History, Minus, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Attention, StageStatus, StateCell } from "@/lib/run-visibility";

interface ChipLook {
  label: string;
  icon: typeof Check;
  className: string;
}

const STATUS_LOOK: Record<StageStatus, ChipLook> = {
  complete: {
    label: "Complete",
    icon: Check,
    className: "border-[hsl(var(--success))]/40 bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]",
  },
  no_work_needed: {
    label: "No Work Needed",
    icon: Check,
    className: "border-primary/40 bg-primary/10 text-primary",
  },
  waiting: {
    label: "Waiting",
    icon: Clock,
    className:
      "border-[hsl(var(--level-moderate))]/40 bg-[hsl(var(--level-moderate))]/10 text-[hsl(var(--level-moderate))]",
  },
  not_applicable: {
    label: "Not Applicable",
    icon: Minus,
    className: "border-border bg-muted text-muted-foreground",
  },
  warning: {
    label: "Warning",
    icon: AlertTriangle,
    className:
      "border-[hsl(var(--level-elevated))]/40 bg-[hsl(var(--level-elevated))]/10 text-[hsl(var(--level-elevated))]",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    className: "border-destructive/40 bg-destructive/10 text-[hsl(var(--destructive))]",
  },
};

const ATTENTION_LOOK: Partial<Record<Attention, ChipLook>> = {
  known_gap: {
    label: "Known Gap",
    icon: History,
    className:
      "border-[hsl(var(--level-elevated))]/40 bg-[hsl(var(--level-elevated))]/10 text-[hsl(var(--level-elevated))]",
  },
  action_required: {
    label: "Needs Attention",
    icon: AlertTriangle,
    className: "border-destructive/50 bg-destructive/10 text-[hsl(var(--destructive))]",
  },
};

const MIXED_LOOK: ChipLook = {
  label: "Mixed",
  icon: CircleSlash,
  className: "border-dashed border-border bg-muted/60 text-foreground/80",
};

export function resolveLook(cell: StateCell): ChipLook {
  const attentionLook = ATTENTION_LOOK[cell.attention];
  const base = attentionLook ?? STATUS_LOOK[cell.status];
  if (cell.mixed && !attentionLook) return { ...MIXED_LOOK, label: cell.label ?? MIXED_LOOK.label };
  return { ...base, label: cell.label ?? base.label };
}

interface StatusChipProps {
  status: StageStatus;
  attention?: Attention;
  mixed?: boolean;
  label?: string;
  className?: string;
  /** Renders the small dashed "partial" hint next to a rollup chip. */
  showMixedHint?: boolean;
  /** Collapsed rollups: understate everything that is not actionable. */
  quiet?: boolean;
}

/**
 * Status and attention are separate backend concepts; this component renders
 * either, and never relies on color alone (icon + text always present).
 */
export default function StatusChip({
  status,
  attention = "none",
  mixed,
  label,
  className,
  showMixedHint = true,
  quiet = false,
}: StatusChipProps) {
  const look = resolveLook({ status, attention, mixed, label });
  const Icon = look.icon;
  const isMixedRollup = Boolean(mixed) && attention !== "none";
  const understate = quiet && attention === "none" && status !== "failed";

  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        understate ? "border-border bg-muted/50 text-muted-foreground" : look.className,
        className,
      )}
    >

      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="truncate">{look.label}</span>
      {isMixedRollup && showMixedHint && (
        <span className="rounded border border-current/30 px-1 text-[10px] font-normal opacity-80">partial</span>
      )}
    </span>
  );
}
