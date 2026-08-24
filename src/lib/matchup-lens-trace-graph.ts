// Deterministic layouts for the reverse-trace drawer.
//
// Two optional visual modes over the same Lens ↔ Tag ↔ Metric relationships the
// list fallback already shows: a relationship network and packed groups. Size in
// the packed view is a *count* of connected supporting metrics, never a claim
// about importance.

import type { LensSnapshot } from "./matchup-lens-types";
import { LENSES, metricsForLens } from "./matchup-lens";
import { readableTag } from "./matchup-lens-language";
import type { TraceTarget } from "./matchup-lens-trace";

export type TraceNodeType = "lens" | "tag" | "metric";

export interface TraceGraphNode {
  id: string;
  type: TraceNodeType;
  /** Raw key without the `type:` prefix, for opening a nested trace. */
  key: string;
  label: string;
  x: number;
  y: number;
  r: number;
}

export interface TraceGraphEdge {
  from: string;
  to: string;
}

export interface TraceGraph {
  nodes: TraceGraphNode[];
  edges: TraceGraphEdge[];
  size: number;
}

const SIZE = 320;
const CENTER = SIZE / 2;
const INNER = 78;
const OUTER = 138;

function ringPoint(index: number, count: number, radius: number) {
  const angle = (Math.PI * 2 * index) / Math.max(1, count) - Math.PI / 2;
  return { x: CENTER + Math.cos(angle) * radius, y: CENTER + Math.sin(angle) * radius };
}

function lensesUsingTag(tag: string) {
  return LENSES.filter((lens) => lens.tags.includes(tag) || lens.excludeTags?.includes(tag));
}

/** Network layout centred on the traced item. */
export function buildTraceGraph(snapshot: LensSnapshot, target: TraceTarget): TraceGraph {
  const nodes: TraceGraphNode[] = [];
  const edges: TraceGraphEdge[] = [];

  if (target.type === "tag") {
    const tag = target.id;
    const centre: TraceGraphNode = {
      id: `tag:${tag}`,
      type: "tag",
      key: tag,
      label: readableTag(tag),
      x: CENTER,
      y: CENTER,
      r: 24,
    };
    nodes.push(centre);

    const lenses = lensesUsingTag(tag);
    lenses.forEach((lens, index) => {
      const point = ringPoint(index, lenses.length, INNER);
      nodes.push({ id: `lens:${lens.key}`, type: "lens", key: lens.key, label: lens.name, ...point, r: 13 });
      edges.push({ from: centre.id, to: `lens:${lens.key}` });
    });

    const metrics = snapshot.metrics.filter((definition) => definition.lensTags.includes(tag));
    metrics.forEach((definition, index) => {
      const point = ringPoint(index, metrics.length, OUTER);
      nodes.push({
        id: `metric:${definition.metric}`,
        type: "metric",
        key: definition.metric,
        label: definition.label,
        ...point,
        r: 8,
      });
      edges.push({ from: centre.id, to: `metric:${definition.metric}` });
    });

    return { nodes, edges, size: SIZE };
  }

  const definition = snapshot.metrics.find((entry) => entry.metric === target.id);
  if (!definition) return { nodes, edges, size: SIZE };

  const centre: TraceGraphNode = {
    id: `metric:${definition.metric}`,
    type: "metric",
    key: definition.metric,
    label: definition.label,
    x: CENTER,
    y: CENTER,
    r: 22,
  };
  nodes.push(centre);

  definition.lensTags.forEach((tag, index) => {
    const point = ringPoint(index, definition.lensTags.length, INNER);
    nodes.push({ id: `tag:${tag}`, type: "tag", key: tag, label: readableTag(tag), ...point, r: 10 });
    edges.push({ from: centre.id, to: `tag:${tag}` });
  });

  const lenses = LENSES.filter((lens) =>
    metricsForLens(lens, snapshot.metrics).some((entry) => entry.metric === definition.metric),
  );
  lenses.forEach((lens, index) => {
    const point = ringPoint(index, lenses.length, OUTER);
    nodes.push({ id: `lens:${lens.key}`, type: "lens", key: lens.key, label: lens.name, ...point, r: 14 });
    for (const tag of definition.lensTags) {
      if (lens.tags.includes(tag)) edges.push({ from: `tag:${tag}`, to: `lens:${lens.key}` });
    }
  });

  return { nodes, edges, size: SIZE };
}

export interface PackedChild {
  key: string;
  label: string;
  x: number;
  y: number;
  r: number;
}

export interface PackedGroup {
  key: string;
  kind: "lens" | "tag";
  label: string;
  /** Number of connected supporting metrics — this is what circle size encodes. */
  count: number;
  x: number;
  y: number;
  r: number;
  children: PackedChild[];
}

export interface PackedLayout {
  groups: PackedGroup[];
  size: number;
  /** Explicit statement of what size means, rendered next to the chart. */
  sizeMeaning: string;
}

const GROUP_COLUMNS = 3;
const GROUP_CELL = 108;

/** Circle packing over the same hierarchy the network shows. */
export function buildPackedGroups(snapshot: LensSnapshot, target: TraceTarget): PackedLayout {
  const raw: { key: string; kind: "lens" | "tag"; label: string; metrics: { key: string; label: string }[] }[] =
    [];

  if (target.type === "tag") {
    const tag = target.id;
    for (const lens of lensesUsingTag(tag)) {
      const members = metricsForLens(lens, snapshot.metrics)
        .filter((definition) => definition.lensTags.includes(tag))
        .map((definition) => ({ key: definition.metric, label: definition.label }));
      raw.push({ key: lens.key, kind: "lens", label: lens.name, metrics: members });
    }
  } else {
    const definition = snapshot.metrics.find((entry) => entry.metric === target.id);
    for (const tag of definition?.lensTags ?? []) {
      const members = snapshot.metrics
        .filter((entry) => entry.lensTags.includes(tag))
        .map((entry) => ({ key: entry.metric, label: entry.label }));
      raw.push({ key: tag, kind: "tag", label: readableTag(tag), metrics: members });
    }
  }

  const maxCount = Math.max(1, ...raw.map((group) => group.metrics.length));
  const rows = Math.max(1, Math.ceil(raw.length / GROUP_COLUMNS));

  const groups: PackedGroup[] = raw.map((group, index) => {
    const column = index % GROUP_COLUMNS;
    const row = Math.floor(index / GROUP_COLUMNS);
    const x = GROUP_CELL / 2 + column * GROUP_CELL;
    const y = GROUP_CELL / 2 + row * GROUP_CELL;
    const r = 16 + 30 * Math.sqrt(group.metrics.length / maxCount);
    const children = group.metrics.slice(0, 12).map((metric, childIndex, all) => {
      const angle = (Math.PI * 2 * childIndex) / Math.max(1, all.length) - Math.PI / 2;
      const orbit = all.length === 1 ? 0 : r * 0.55;
      return {
        key: metric.key,
        label: metric.label,
        x: x + Math.cos(angle) * orbit,
        y: y + Math.sin(angle) * orbit,
        r: Math.max(3.5, r / (all.length > 6 ? 7 : 4)),
      };
    });
    return { ...group, count: group.metrics.length, x, y, r, children };
  });

  return {
    groups,
    size: Math.max(GROUP_CELL, GROUP_COLUMNS * GROUP_CELL),
    sizeMeaning: "Circle size = number of connected supporting metrics (a count, not an importance score).",
  };
}
