import { useId } from "react";

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
  selectedKey: string;
  onSelect: (key: string) => void;
  onHover: (key: string | null) => void;
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
 * Six-axis constellation comparing two teams' lens scores. Purely a renderer —
 * every value is supplied by the scoring engine.
 */
export function LensConstellation({
  axes,
  labelA,
  labelB,
  selectedKey,
  onSelect,
  onHover,
}: LensConstellationProps) {
  const id = useId();
  const count = axes.length;

  return (
    <div className="w-full">
      <div className="mb-2 flex flex-wrap items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-accent-cool">
          <span className="h-2.5 w-2.5 rounded-full bg-accent-cool" aria-hidden />
          {labelA}
        </span>
        <span className="flex items-center gap-1.5 font-semibold text-primary">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />
          {labelB}
        </span>
        <span className="text-muted-foreground">Rings 25 / 50 / 75 / 100 percentile</span>
      </div>
      <svg
        viewBox={`-58 -6 ${SIZE + 116} ${SIZE + 12}`}
        className="mx-auto block h-auto w-full max-w-[480px]"
        role="img"
        aria-label={`Six-lens comparison between ${labelA} and ${labelB}, fixed 0 to 100 scale`}
        data-scale-max="100"
      >
        {/* Rings */}
        {RINGS.map((ratio) => (

          <polygon
            key={ratio}
            points={axes.map((_, index) => {
              const p = point(index, count, ratio);
              return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
            }).join(" ")}
            className="fill-none stroke-border"
            strokeWidth={ratio === 1 ? 1.2 : 0.7}
          />
        ))}

        {/* Spokes */}
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

        {/* Team B (home) shape */}
        <polygon
          points={polygon(axes, (axis) => axis.scoreB)}
          className="fill-primary/20 stroke-primary"
          strokeWidth={1.6}
        />
        {/* Team A (away) shape */}
        <polygon
          points={polygon(axes, (axis) => axis.scoreA)}
          className="fill-accent-cool/20 stroke-accent-cool"
          strokeWidth={1.6}
        />

        {/* Vertices + hit areas */}
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
              <circle cx={b.x} cy={b.y} r={3} className="fill-primary" />
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

      {/* Axis buttons — keyboard-accessible and the primary control on touch. */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {axes.map((axis) => {
          const isSelected = axis.key === selectedKey;
          return (
            <button
              key={axis.key}
              type="button"
              onClick={() => onSelect(axis.key)}
              onMouseEnter={() => onHover(axis.key)}
              onMouseLeave={() => onHover(null)}
              onFocus={() => onHover(axis.key)}
              onBlur={() => onHover(null)}
              aria-pressed={isSelected}
              className={`rounded-md border px-2.5 py-2 text-left transition-colors ${
                isSelected
                  ? "border-foreground/30 bg-secondary"
                  : "border-border bg-card hover:border-muted-foreground/40"
              }`}
            >
              <span className="block text-[10px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {axis.name}
              </span>
              <span className="mt-1 flex items-baseline gap-2 text-sm font-semibold tabular-nums">
                <span className="text-accent-cool">
                  {axis.scoreA === null ? "—" : axis.scoreA.toFixed(1)}
                </span>
                <span className="text-[10px] text-muted-foreground">vs</span>
                <span className="text-primary">
                  {axis.scoreB === null ? "—" : axis.scoreB.toFixed(1)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
