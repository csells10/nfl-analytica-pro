import { useEffect, useState } from "react";
import { Activity, Gauge, Flame, Zap } from "lucide-react";

/**
 * MatchupAnalyzing
 * Structured "live analysis" loading state for the Game Details page.
 * Confident, calm, analytical — uses semantic tokens only.
 */

const STAGES = [
  "Loading matchup context…",
  "Comparing team profiles…",
  "Checking recent form…",
  "Building matchup lens…",
];

export function MatchupAnalyzing() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 1300);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-5">
      {/* Stage banner */}
      <div className="flex items-center gap-2 text-xs">
        <Activity className="h-3.5 w-3.5 text-primary" />
        <span
          key={stageIndex}
          className="animate-fade-in font-medium tracking-tight text-foreground/80"
        >
          {STAGES[stageIndex]}
        </span>
      </div>

      {/* Header — teams vs */}
      <SectionPanel delay={0} label="Matchup">
        <div className="relative overflow-hidden">
          <div className="flex items-center justify-between gap-4">
            <TeamHeaderSkeleton align="left" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60">
              vs
            </span>
            <TeamHeaderSkeleton align="right" />
          </div>
          {/* Horizontal scan line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-y-0 left-0 w-1/3 animate-shimmer-slide bg-gradient-to-r from-transparent via-primary/15 to-transparent"
          />
        </div>
      </SectionPanel>

      {/* Game Profile — three signal tiles */}
      <SectionPanel delay={120} label="Game Profile">
        <div className="grid grid-cols-3 gap-3">
          <SignalTile icon={Zap} title="Tempo" delay={0} />
          <SignalTile icon={Flame} title="Pressure" delay={120} />
          <SignalTile icon={Gauge} title="Scoring" delay={240} />
        </div>
      </SectionPanel>

      {/* Team Comparison — clean dual bars */}
      <SectionPanel delay={240} label="Team Comparison">
        <div className="space-y-3.5">
          {[0.62, 0.45, 0.55].map((bias, i) => (
            <ComparisonRow key={i} delay={i * 140} leftBias={bias} />
          ))}
        </div>
      </SectionPanel>

      {/* Matchup Breakdown — subtle grid + diagonal sweep */}
      <SectionPanel delay={360} label="Matchup Breakdown">
        <div className="relative h-28 overflow-hidden rounded-md bg-muted/15">
          <div
            aria-hidden
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(var(--border) / 0.5) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.5) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />
          <div
            aria-hidden
            className="absolute inset-y-0 -left-1/3 w-1/2 animate-shimmer-slide bg-gradient-to-r from-transparent via-primary/15 to-transparent"
            style={{ transform: "skewX(-12deg)" }}
          />
        </div>
      </SectionPanel>
    </div>
  );
}

// ── Sub-components ───────────────────────────────────────────

function SectionPanel({
  children,
  delay,
  label,
}: {
  children: React.ReactNode;
  delay: number;
  label: string;
}) {
  return (
    <div
      className="rounded-lg border border-border/60 bg-card/70 p-4 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
        {label}
      </p>
      {children}
    </div>
  );
}

function TeamHeaderSkeleton({ align }: { align: "left" | "right" }) {
  return (
    <div
      className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : ""}`}
    >
      <div className="h-12 w-12 rounded-full bg-muted/60" />
      <div className={`space-y-1.5 ${align === "right" ? "items-end" : ""} flex flex-col`}>
        <div className="h-2.5 w-14 rounded-sm bg-muted/50" />
        <div className="h-3.5 w-28 rounded-sm bg-muted/70" />
      </div>
    </div>
  );
}

function SignalTile({
  icon: Icon,
  title,
  delay,
}: {
  icon: typeof Activity;
  title: string;
  delay: number;
}) {
  const heights = [40, 70, 55, 85, 60];
  return (
    <div className="rounded-md border border-border/50 bg-muted/10 p-3">
      <div className="mb-2.5 flex items-center gap-1.5">
        <Icon className="h-3 w-3 text-primary/80" />
        <span className="text-[10px] font-medium uppercase tracking-wider text-foreground/60">
          {title}
        </span>
      </div>
      <div className="flex h-10 items-end justify-between gap-1">
        {heights.map((h, i) => (
          <div
            key={i}
            className="relative flex-1 overflow-hidden rounded-sm bg-muted/30"
            style={{ height: `${h}%` }}
          >
            <div
              className="absolute inset-0 animate-shimmer-slide bg-gradient-to-t from-primary/50 to-primary/20"
              style={{ animationDelay: `${delay + i * 90}ms` }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function ComparisonRow({ delay, leftBias }: { delay: number; leftBias: number }) {
  const leftPct = Math.round(leftBias * 100);
  const rightPct = 100 - leftPct;
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        <div className="ml-auto h-2 w-12 rounded-sm bg-muted/50" />
        <div className="h-2 w-10 rounded-sm bg-muted/40" />
        <div className="h-2 w-12 rounded-sm bg-muted/50" />
      </div>
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
        {/* Left bar — fills from right edge inward */}
        <div className="relative h-2 overflow-hidden rounded-full bg-muted/25">
          <div
            className="absolute inset-y-0 right-0 overflow-hidden rounded-full bg-accent-cool/70"
            style={{ width: `${leftPct}%` }}
          >
            <div
              className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
              style={{ animationDelay: `${delay}ms` }}
            />
          </div>
        </div>
        <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
        {/* Right bar — fills from left */}
        <div className="relative h-2 overflow-hidden rounded-full bg-muted/25">
          <div
            className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-primary/70"
            style={{ width: `${rightPct}%` }}
          >
            <div
              className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-foreground/20 to-transparent"
              style={{ animationDelay: `${delay + 100}ms` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
