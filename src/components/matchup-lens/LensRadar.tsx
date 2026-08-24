export interface RadarAxis {
  key: string;
  name: string;
  value: number | null;
}

const SIZE = 260;
const CENTER = SIZE / 2;
const RADIUS = 84;
export const RADAR_RINGS = [0.25, 0.5, 0.75, 1];

export function radarPoint(index: number, count: number, ratio: number) {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ratio,
    y: CENTER + Math.sin(angle) * RADIUS * ratio,
  };
}

interface LensRadarProps {
  axes: RadarAxis[];
  title: string;
  tone: "a" | "b";
  selectedKey: string;
  onSelect: (key: string) => void;
}

/**
 * Single-team small-multiple radar. Fixed 0-100 scale, identical geometry and
 * axis order regardless of which team it renders, so shapes stay comparable.
 */
export function LensRadar({ axes, title, tone, selectedKey, onSelect }: LensRadarProps) {
  const count = axes.length;
  const stroke = tone === "a" ? "stroke-accent-cool" : "stroke-primary";
  const fill = tone === "a" ? "fill-accent-cool/20" : "fill-primary/20";
  const dot = tone === "a" ? "fill-accent-cool" : "fill-primary";

  const points = axes
    .map((axis, index) => {
      const ratio = Math.max(0, Math.min(100, axis.value ?? 0)) / 100;
      const p = radarPoint(index, count, ratio);
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <div className="min-w-0">
      <p
        className={`text-center text-xs font-semibold uppercase tracking-[0.14em] ${
          tone === "a" ? "text-accent-cool" : "text-primary"
        }`}
      >
        {title}
      </p>
      <svg
        viewBox={`-52 -8 ${SIZE + 104} ${SIZE + 16}`}
        className="mx-auto block h-auto w-full max-w-[360px]"
        role="img"
        aria-label={`${title} lens shape, scale 0 to 100`}
        data-testid={`fingerprint-radar-${tone}`}
        data-axis-order={axes.map((axis) => axis.key).join(",")}
        data-scale-max="100"
      >
        {RADAR_RINGS.map((ratio) => (
          <polygon
            key={ratio}
            points={axes
              .map((_, index) => {
                const p = radarPoint(index, count, ratio);
                return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
              })
              .join(" ")}
            className="fill-none stroke-border"
            strokeWidth={ratio === 1 ? 1.2 : 0.7}
          />
        ))}

        {axes.map((axis, index) => {
          const p = radarPoint(index, count, 1);
          return (
            <line
              key={axis.key}
              x1={CENTER}
              y1={CENTER}
              x2={p.x}
              y2={p.y}
              className={axis.key === selectedKey ? "stroke-foreground/40" : "stroke-border"}
              strokeWidth={axis.key === selectedKey ? 1.4 : 0.7}
            />
          );
        })}

        <polygon points={points} className={`${fill} ${stroke}`} strokeWidth={1.8} />

        {axes.map((axis, index) => {
          const ratio = Math.max(0, Math.min(100, axis.value ?? 0)) / 100;
          const p = radarPoint(index, count, ratio);
          const hit = radarPoint(index, count, 1);
          const labelPoint = radarPoint(index, count, 1.34);
          const anchor =
            Math.abs(labelPoint.x - CENTER) < 8 ? "middle" : labelPoint.x > CENTER ? "start" : "end";
          const isSelected = axis.key === selectedKey;
          return (
            <g key={axis.key}>
              <circle cx={p.x} cy={p.y} r={3} className={dot} />
              <text
                x={labelPoint.x}
                y={labelPoint.y}
                textAnchor={anchor}
                dominantBaseline="middle"
                className={`text-[9px] font-semibold uppercase tracking-[0.06em] ${
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
                r={22}
                className="cursor-pointer fill-transparent"
                onClick={() => onSelect(axis.key)}
              />
            </g>
          );
        })}
      </svg>
    </div>
  );
}
