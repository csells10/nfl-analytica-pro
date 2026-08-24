import type { LensSnapshot } from "@/lib/matchup-lens-types";
import type { TraceTarget } from "@/lib/matchup-lens-trace";
import { buildPackedGroups, buildTraceGraph } from "@/lib/matchup-lens-trace-graph";

interface TraceGraphsProps {
  snapshot: LensSnapshot;
  target: TraceTarget;
  mode: "network" | "packed";
  onOpenTrace: (target: TraceTarget) => void;
  onSelectLens: (lensKey: string) => void;
}

/**
 * Optional visual modes for the reverse-trace drawer. Lazy-loaded so the summary
 * dashboard never pays for them, and always paired with the list fallback.
 */
export default function TraceGraphs({
  snapshot,
  target,
  mode,
  onOpenTrace,
  onSelectLens,
}: TraceGraphsProps) {
  if (mode === "network") {
    const graph = buildTraceGraph(snapshot, target);
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    const tone = (type: string) =>
      type === "lens" ? "fill-foreground/70" : type === "tag" ? "fill-accent-cool" : "fill-primary";

    return (
      <div data-testid="trace-network">
        <p className="text-[11px] text-muted-foreground">
          Relationship graph: lens ↔ signal ↔ metric, centred on the traced item.
        </p>
        <svg
          viewBox={`-20 -20 ${graph.size + 40} ${graph.size + 40}`}
          className="mx-auto mt-2 block h-auto w-full max-w-[340px]"
          role="img"
          aria-label={`Relationship graph with ${graph.nodes.length} nodes and ${graph.edges.length} connections`}
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
                className={`${tone(node.type)} cursor-pointer opacity-90`}
                onClick={() => {
                  if (node.type === "lens") onSelectLens(node.key);
                  else onOpenTrace({ type: node.type as "tag" | "metric", id: node.key });
                }}
              />
              {node.type !== "metric" && (
                <text
                  x={node.x}
                  y={node.y + node.r + 8}
                  textAnchor="middle"
                  className="fill-muted-foreground text-[7px] font-semibold"
                >
                  {node.label}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>
    );
  }

  const packed = buildPackedGroups(snapshot, target);
  const rows = Math.max(1, Math.ceil(packed.groups.length / 3));

  return (
    <div data-testid="trace-packed">
      <p className="text-[11px] text-muted-foreground">{packed.sizeMeaning}</p>
      <svg
        viewBox={`0 0 ${packed.size} ${rows * 108}`}
        className="mx-auto mt-2 block h-auto w-full max-w-[340px]"
        role="img"
        aria-label={`Packed groups: ${packed.groups.length} groups sized by connected supporting metric count`}
        data-group-count={packed.groups.length}
      >
        {packed.groups.map((group) => (
          <g key={group.key}>
            <circle
              cx={group.x}
              cy={group.y}
              r={group.r}
              className="fill-muted/40 stroke-border"
              data-group={group.key}
              data-count={group.count}
            />
            {group.children.map((child) => (
              <circle
                key={child.key}
                cx={child.x}
                cy={child.y}
                r={child.r}
                data-metric={child.key}
                className="cursor-pointer fill-accent-cool/70 stroke-card"
                onClick={() => onOpenTrace({ type: "metric", id: child.key })}
              />
            ))}
            <text
              x={group.x}
              y={group.y + group.r + 8}
              textAnchor="middle"
              className="fill-muted-foreground text-[7px] font-semibold"
            >
              {group.label} ({group.count})
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
