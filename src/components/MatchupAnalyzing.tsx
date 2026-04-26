import { useEffect, useState } from "react";
import { Activity } from "lucide-react";

/**
 * MatchupAnalyzing
 * Structured "live analysis" loading state for the Game Details page.
 * Pure CSS animations, no heavy libraries.
 */

const STAGES = [
  "Analyzing matchup data…",
  "Comparing team performance…",
  "Evaluating key game drivers…",
  "Building your matchup lens…",
];

export function MatchupAnalyzing() {
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStageIndex((i) => (i + 1) % STAGES.length);
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="space-y-6">
      {/* Stage banner */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Activity className="h-3.5 w-3.5 animate-pulse text-primary" />
        <span
          key={stageIndex}
          className="animate-fade-in font-medium tracking-tight text-foreground/80"
        >
          {STAGES[stageIndex]}
        </span>
      </div>

      {/* Header skeleton — teams + score */}
      <SectionPanel delay={0} label="Matchup">
        <div className="flex items-center gap-4">
          <TeamHeaderSkeleton />
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/40">at</span>
          <TeamHeaderSkeleton />
        </div>
      </SectionPanel>

      {/* Game Profile — pulsing signal strength bars */}
      <SectionPanel delay={120} label="Game Profile">
        <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3">
          {[68, 42, 84, 55, 73, 38].map((w, i) => (
            <SignalBar key={i} width={w} delay={i * 90} />
          ))}
        </div>
      </SectionPanel>

      {/* Team Comparison — sliding comparison bars */}
      <SectionPanel delay={240} label="Team Comparison">
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <ComparisonRow key={i} delay={i * 110} leftBias={[0.62, 0.4, 0.55, 0.48][i]} />
          ))}
        </div>
      </SectionPanel>

      {/* Matchup Breakdown — faint grid shimmer */}
      <SectionPanel delay={360} label="Matchup Breakdown">
        <div className="relative h-32 overflow-hidden rounded-md bg-muted/20">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "linear-gradient(to right, hsl(var(--border) / 0.4) 1px, transparent 1px), linear-gradient(to bottom, hsl(var(--border) / 0.4) 1px, transparent 1px)",
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute inset-0 animate-shimmer-slide bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent" />
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
      className="rounded-lg border border-border/50 bg-card/60 p-4 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground/55">
        {label}
      </p>
      {children}
    </div>
  );
}

function TeamHeaderSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-muted/40 animate-pulse" />
      <div className="space-y-1.5">
        <div className="h-2 w-12 rounded-sm bg-muted/40" />
        <div className="h-3 w-24 rounded-sm bg-muted/50 animate-pulse" />
      </div>
    </div>
  );
}

function SignalBar({ width, delay }: { width: number; delay: number }) {
  return (
    <div className="space-y-1.5">
      <div className="h-2 w-16 rounded-sm bg-muted/40" />
      <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/30">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-primary/40 animate-pulse"
          style={{ width: `${width}%`, animationDelay: `${delay}ms` }}
        />
      </div>
    </div>
  );
}

function ComparisonRow({ delay, leftBias }: { delay: number; leftBias: number }) {
  const leftPct = Math.round(leftBias * 100);
  const rightPct = 100 - leftPct;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <div className="h-2 w-14 rounded-sm bg-muted/40" />
        <div className="h-2 w-14 rounded-sm bg-muted/40" />
      </div>
      <div className="flex items-center gap-1.5">
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
          <div
            className="absolute inset-y-0 right-0 rounded-full bg-accent-cool/50 animate-shimmer-slide"
            style={{ width: `${leftPct}%`, animationDelay: `${delay}ms` }}
          />
        </div>
        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-muted/30">
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-primary/40 animate-shimmer-slide"
            style={{ width: `${rightPct}%`, animationDelay: `${delay + 80}ms` }}
          />
        </div>
      </div>
    </div>
  );
}
