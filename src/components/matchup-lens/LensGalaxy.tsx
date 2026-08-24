import { Card, CardContent } from "@/components/ui/card";
import type { LensDefinition, LensScore } from "@/lib/matchup-lens";
import { readableTag } from "@/lib/matchup-lens-language";
import type { TraceHandlers } from "./TraceChips";

export interface GalaxyNode {
  id: string;
  type: "lens" | "tag" | "metric";
  label: string;
  /** Relative influence used for node size (weights for metrics). */
  influence: number;
  x: number;
  y: number;
  r: number;
}

export interface GalaxyEdge {
  from: string;
  to: string;
}

export interface GalaxyGraph {
  nodes: GalaxyNode[];
  edges: GalaxyEdge[];
}

const SIZE = 360;
const CENTER = SIZE / 2;
const TAG_RADIUS = 92;
const METRIC_RADIUS = 158;

function ringPoint(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / Math.max(1, count) - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
}

/**
 * Deterministic focused graph for one lens: lens -> tags -> supporting metrics.
 * Only tags that actually connect a contributing metric are drawn, so the graph
 * stays readable instead of turning into league-wide spaghetti.
 */
export function buildGalaxyGraph(lens: LensDefinition, score: LensScore): GalaxyGraph {
  const contributions = score.contributions;
  const activeTags = lens.tags.filter((tag) =>
    contributions.some((contribution) => contribution.lensTags.includes(tag)),
  );

  const nodes: GalaxyNode[] = [
    { id: `lens:${lens.key}`, type: "lens", label: lens.name, influence: 1, x: CENTER, y: CENTER, r: 30 },
  ];
  const edges: GalaxyEdge[] = [];

  activeTags.forEach((tag, index) => {
    const point = ringPoint(index, activeTags.length, TAG_RADIUS);
    nodes.push({ id: `tag:${tag}`, type: "tag", label: readableTag(tag), influence: 1, ...point, r: 12 });
    edges.push({ from: `lens:${lens.key}`, to: `tag:${tag}` });
  });

  const maxWeight = Math.max(1, ...contributions.map((contribution) => contribution.weight));
  contributions.forEach((contribution, index) => {
    const point = ringPoint(index, contributions.length, METRIC_RADIUS);
    nodes.push({
      id: `metric:${contribution.metric}`,
      type: "metric",
      label: contribution.label,
      influence: contribution.weight,
      ...point,
      r: 7 + 7 * Math.sqrt(contribution.weight / maxWeight),
    });
    for (const tag of contribution.lensTags) {
      if (activeTags.includes(tag)) {
        edges.push({ from: `tag:${tag}`, to: `metric:${contribution.metric}` });
      }
    }
  });

  return { nodes, edges };
}

interface LensGalaxyProps extends TraceHandlers {
  lens: LensDefinition;
  score: LensScore;
  teamLabel: string;
}

export function LensGalaxy({ lens, score, teamLabel, onOpenTrace }: LensGalaxyProps) {
  const graph = buildGalaxyGraph(lens, score);
  const byId = new Map(graph.nodes.map((node) => [node.id, node]));

  const open = (node: GalaxyNode) => {
    if (node.type === "tag") onOpenTrace({ type: "tag", id: node.id.slice(4) });
    if (node.type === "metric") onOpenTrace({ type: "metric", id: node.id.slice(7) });
  };

  const tone = (type: GalaxyNode["type"]) =>
    type === "lens" ? "fill-foreground/80" : type === "tag" ? "fill-accent-cool" : "fill-primary";

  return (
    <Card className="border-border bg-card" data-testid="lens-galaxy">
      <CardContent className="p-4 sm:p-5">
        <h3 className="text-sm font-semibold tracking-tight text-foreground">Lens Galaxy</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {lens.name} at the centre, its lens tags on the inner ring, and every supporting metric on
          the outer ring. Node size shows how much a metric influences the Lens Score. Filtered to
          the selected lens so the graph stays readable.
        </p>
        <div className="mt-2 flex flex-wrap gap-3 text-[11px]">
          <span className="flex items-center gap-1.5 text-foreground">
            <span className="h-2 w-2 rounded-full bg-foreground/80" aria-hidden /> Lens
          </span>
          <span className="flex items-center gap-1.5 text-accent-cool">
            <span className="h-2 w-2 rounded-full bg-accent-cool" aria-hidden /> Lens tag
          </span>
          <span className="flex items-center gap-1.5 text-primary">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden /> Supporting metric ·{" "}
            {teamLabel} evidence
          </span>
        </div>

        <svg
          viewBox={`-24 -24 ${SIZE + 48} ${SIZE + 48}`}
          className="mx-auto mt-3 block h-auto w-full max-w-[520px]"
          role="img"
          aria-label={`${lens.name} network: ${graph.nodes.length} nodes and ${graph.edges.length} connections`}
          data-testid="galaxy-svg"
          data-node-count={graph.nodes.length}
          data-edge-count={graph.edges.length}
        >
          {graph.edges.map((edge) => {
            const from = byId.get(edge.from);
            const to = byId.get(edge.to);
            if (!from || !to) return null;
            return (
              <line
                key={`${edge.from}->${edge.to}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="stroke-border"
                strokeWidth={0.8}
              />
            );
          })}
          {graph.nodes.map((node) => (
            <g key={node.id}>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.r}
                className={`${tone(node.type)} ${node.type === "lens" ? "" : "cursor-pointer"} opacity-90`}
                onClick={() => open(node)}
              />
              {node.type !== "metric" && (
                <text
                  x={node.x}
                  y={node.y + node.r + 9}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[8px] font-semibold"
                >
                  {node.label}
                </text>
              )}
            </g>
          ))}
        </svg>

        {/* Readable, keyboard-accessible representation of the same graph. */}
        <div className="mt-4" data-testid="galaxy-fallback">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Connections ({graph.edges.length})
          </p>
          <ul className="mt-2 space-y-1">
            {graph.nodes
              .filter((node) => node.type !== "lens")
              .map((node) => (
                <li key={node.id}>
                  <button
                    type="button"
                    data-node-id={node.id}
                    onClick={() => open(node)}
                    className="flex w-full flex-wrap items-baseline justify-between gap-2 rounded border border-transparent px-2 py-1.5 text-left text-[11px] transition-colors hover:border-border hover:bg-muted/30"
                  >
                    <span className="text-foreground">
                      {node.type === "tag" ? "Lens tag" : "Metric"} · {node.label}
                    </span>
                    <span className="text-muted-foreground">
                      {node.type === "tag"
                        ? `${graph.edges.filter((edge) => edge.from === node.id).length} metrics`
                        : `Influence ${node.influence}`}
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
