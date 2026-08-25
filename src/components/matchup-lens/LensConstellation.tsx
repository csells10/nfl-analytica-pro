import { useId } from "react";
import { LensRadar, type RadarAxis } from "./LensRadar";
import type { ConstellationLayout } from "@/lib/matchup-lens-view";

export interface ConstellationAxis {
  key: string;
  name: string;
  scoreA: number | null;
  scoreB: number | null;
}

interface LensConstellationProps {
  axes: ConstellationAxis[];
  labelA: string;
  labelB: string;
  nameA: string;
  nameB: string;
  selectedKey: string | null;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
  layout: ConstellationLayout;
  onLayoutChange: (layout: ConstellationLayout) => void;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 108;
const RINGS = [0.25, 0.5, 0.75, 1];

function point(index: number, count: number, ratio: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ratio,
    y: CENTER + Math.sin(angle) * RADIUS * ratio,
  };
}

function polygon(axes: ConstellationAxis[], pick: (axis: ConstellationAxis) => number | null) {
  return axes
    .map((axis, index) => {
      const value = pick(axis) ?? 0;
      const { x, y } = point(index, axes.length, Math.max(0, Math.min(100, value)) / 100);
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

/**
 * Six-axis comparison of two teams' Lens Scores. Overlay draws both shapes on
 * one set of axes; side by side draws the same axes and the same fixed 0–100
 * scale as two small multiples. Purely a renderer — the scoring engine supplies
 * every value.
 */
export function LensConstellation({
  axes,
  labelA,
  labelB,
  nameA,
  nameB,
  selectedKey,
  onSelect,
  onHover,
  layout,
  onLayoutChange,
}: LensConstellationProps) {
  const id = useId();
  const count = axes.length;
  const axesA: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreA }));
  const axesB: RadarAxis[] = axes.map((axis) => ({ key: axis.key, name: axis.name, value: axis.scoreB }));

  return (
    <div className="w-full" data-testid="lens-constellation" data-layout={layout}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-foreground">Constellation</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Select a lens to explore the metrics behind the shape.
          </p>
        </div>
        <div
          role="group"
          aria-label="Constellation layout"
          className="flex shrink-0 gap-1 rounded-md border border-border p-0.5"
        >
          {(
            [
              { value: "overlay" as const, label: "Overlay" },
              { value: "side" as const, label: "Side by side" },
            ]
          ).map((option) => (
            <button
              key={option.value}
              type="button"
              data-layout-option={option.value}
              aria-pressed={layout === option.value}
              onClick={() => onLayoutChange(option.value)}
              className={`rounded px-2.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                layout === option.value
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-accent-cool">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-cool" aria-hidden />
          {nameA} ({labelA}) · solid circle
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <span className="h-2.5 w-2.5 rotate-45 bg-primary" aria-hidden />
          {nameB} ({labelB}) · diamond
        </span>
        <span className="text-muted-foreground">Lens Score rings 25 / 50 / 75 / 100</span>
      </div>

      {layout === "side" ? (
        <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2" data-testid="constellation-side">
          <div className="min-w-0">
            <p className="mb-1 text-center text-[11px] text-muted-foreground">{nameA}</p>
            <LensRadar
              axes={axesA}
              title={labelA}
              tone="a"
              selectedKey={selectedKey ?? ""}
              onSelect={onSelect}
            />
          </div>
          <div className="min-w-0">
            <p className="mb-1 text-center text-[11px] text-muted-foreground">{nameB}</p>
            <LensRadar
              axes={axesB}
              title={labelB}
              tone="b"
              selectedKey={selectedKey ?? ""}
              onSelect={onSelect}
            />
          </div>
        </div>
      ) : (
        <svg
          viewBox={`-58 -6 ${SIZE + 116} ${SIZE + 12}`}
          className="mx-auto mt-2 block h-auto w-full max-w-[440px]"
          role="img"
          aria-label={`Six-lens comparison between ${labelA} and ${labelB}, fixed 0 to 100 scale`}
          data-scale-max="100"
          data-testid="constellation-overlay"
        >
          {RINGS.map((ratio) => (
            <polygon
              key={ratio}
              points={axes
                .map((_, index) => {
                  const p = point(index, count, ratio);
                  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
                })
                .join(" ")}
              className="fill-none stroke-border"
              strokeWidth={ratio === 1 ? 1.2 : 0.7}
            />
          ))}

          {RINGS.map((ratio) => (
            <text
              key={`ring-${ratio}`}
              x={CENTER + 3}
              y={CENTER - RADIUS * ratio}
              dominantBaseline="middle"
              className="fill-muted-foreground/70 text-[8px] tabular-nums"
            >
              {ratio * 100}
            </text>
          ))}

          {axes.map((axis, index) => {
            const p = point(index, count, 1);
            const isSelected = axis.key === selectedKey;
            return (
              <line
                key={axis.key}
                x1={CENTER}
                y1={CENTER}
                x2={p.x}
                y2={p.y}
                className={isSelected ? "stroke-foreground/40" : "stroke-border"}
                strokeWidth={isSelected ? 1.4 : 0.7}
              />
            );
          })}

          <polygon
            points={polygon(axes, (axis) => axis.scoreB)}
            className="fill-primary/20 stroke-primary"
            strokeWidth={1.6}
            strokeDasharray="4 2"
          />
          <polygon
            points={polygon(axes, (axis) => axis.scoreA)}
            className="fill-accent-cool/20 stroke-accent-cool"
            strokeWidth={1.6}
          />

          {axes.map((axis, index) => {
            const isSelected = axis.key === selectedKey;
            const a = point(index, count, (axis.scoreA ?? 0) / 100);
            const b = point(index, count, (axis.scoreB ?? 0) / 100);
            const hit = point(index, count, 1);
            const labelPoint = point(index, count, 1.28);
            const anchor =
              Math.abs(labelPoint.x - CENTER) < 8 ? "middle" : labelPoint.x > CENTER ? "start" : "end";
            return (
              <g key={`${id}-${axis.key}`}>
                <rect
                  x={b.x - 3}
                  y={b.y - 3}
                  width={6}
                  height={6}
                  transform={`rotate(45 ${b.x} ${b.y})`}
                  className="fill-primary"
                />
                <circle cx={a.x} cy={a.y} r={3} className="fill-accent-cool" />
                <text
                  x={labelPoint.x}
                  y={labelPoint.y}
                  textAnchor={anchor}
                  dominantBaseline="middle"
                  className={`text-[9px] font-semibold uppercase tracking-[0.08em] ${
                    isSelected ? "fill-foreground" : "fill-muted-foreground"
                  }`}
                >
                  {axis.name.split(" ").map((word, wordIndex, words) => (
                    <tspan
                      key={word}
                      x={labelPoint.x}
                      dy={wordIndex === 0 ? `${-(words.length - 1) * 0.45}em` : "1.05em"}
                    >
                      {word}
                    </tspan>
                  ))}
                </text>
                <circle
                  cx={hit.x}
                  cy={hit.y}
                  r={26}
                  className="cursor-pointer fill-transparent"
                  onClick={() => onSelect(axis.key)}
                  onMouseEnter={() => onHover(axis.key)}
                  onMouseLeave={() => onHover(null)}
                />
              </g>
            );
          })}
        </svg>
      )}

      {/* Score tiles — keyboard-accessible and the primary control on touch. */}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {axes.map((axis) => {
          const isSelected = axis.key === selectedKey;
          return (
            <button
              key={axis.key}
              type="button"
              data-lens-key={axis.key}
              onClick={() => onSelect(axis.key)}
              onMouseEnter={() => onHover(axis.key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(axis.key)}
              onBlur={() => onHover(null)}
              aria-pressed={isSelected}
              className={`min-h-[44px] cursor-pointer rounded-md border px-2.5 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                isSelected
                  ? "border-foreground/30 bg-secondary"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {axis.name}
              </span>
              <span className="mt-1 flex items-baseline gap-2 font-mono text-sm font-semibold tabular-nums">
                <span className="text-accent-cool">
                  {axis.scoreA === null ? "—" : axis.scoreA.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground">vs</span>
                <span className="text-primary">
                  {axis.scoreB === null ? "—" : axis.scoreB.toFixed(1)}
                </span>
              </span>
              <span className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-primary">
                Explore
                <span aria-hidden="true">→</span>
              </span>

            </button>
          );
        })}
      </div>
    </div>
  );
}
