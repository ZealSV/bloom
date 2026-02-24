"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as d3 from "d3";
import { GitFork, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { Concept, ConceptRelationship } from "@/hooks/useSession";

interface ConceptGraphProps {
  concepts: Concept[];
  relationships: ConceptRelationship[];
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  name: string;
  mastery: number;
  status: string;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  relationship: string;
  reasoning?: string | null;
}

const CONCEPT_STOP_WORDS = new Set([
  "a",
  "an",
  "the",
  "is",
  "are",
  "was",
  "were",
  "what",
  "how",
  "why",
  "does",
  "do",
  "did",
  "of",
  "to",
  "in",
  "on",
  "for",
  "and",
  "about",
  "explain",
  "define",
]);

function stemToken(token: string): string {
  if (token.length <= 4) return token;
  if (token.endsWith("ive")) return token.slice(0, -3);
  if (token.endsWith("ion")) return token.slice(0, -3);
  if (token.endsWith("ing")) return token.slice(0, -3);
  if (token.endsWith("ed")) return token.slice(0, -2);
  if (token.endsWith("es")) return token.slice(0, -2);
  if (token.endsWith("s")) return token.slice(0, -1);
  return token;
}

function conceptIdentityKey(name: string): string {
  const tokens = name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .filter((t) => !CONCEPT_STOP_WORDS.has(t))
    .map(stemToken);

  if (tokens.length === 0) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  return tokens.join(" ");
}

function buildCanonicalConcepts(concepts: Concept[]) {
  const canonical = new Map<string, Concept>();
  for (const c of concepts) {
    const key = conceptIdentityKey(c.name);
    if (!key) continue;
    const existing = canonical.get(key);
    if (!existing || c.mastery_score > existing.mastery_score) {
      canonical.set(key, c);
    }
  }
  return canonical;
}

function getNodeColor(mastery: number, status: string): string {
  if (status === "mastered" || mastery >= 80) return "#4ade80";
  if (mastery >= 40) return "#fbbf24";
  if (mastery > 0) return "#f43f5e";
  return "#475569";
}

function getLinkColor(relationship: string): string {
  switch (relationship) {
    case "requires":
      return "#f59e0b";
    case "supports":
      return "#4ade80";
    case "example_of":
      return "#60a5fa";
    case "contradicts":
      return "#f43f5e";
    default:
      return "#64748b";
  }
}

function getLinkStyle(relationship: string): string {
  switch (relationship) {
    case "requires":
      return "";
    case "supports":
      return "6,3";
    case "example_of":
      return "2,2";
    case "contradicts":
      return "8,3,2,3";
    default:
      return "4,4";
  }
}

const GRAPH_HEIGHT = 450;
const NODE_PADDING = 40;

export default function ConceptGraph({
  concepts,
  relationships,
}: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const nodesRef = useRef<GraphNode[]>([]);
  const [width, setWidth] = useState(400);

  const zoomToFit = useCallback(() => {
    if (!svgRef.current || !zoomRef.current || nodesRef.current.length === 0) return;
    const svg = d3.select(svgRef.current);
    const nodes = nodesRef.current;
    const currentWidth = svgRef.current.clientWidth || width;
    const height = GRAPH_HEIGHT;

    // Calculate bounding box of all nodes
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const n of nodes) {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }

    // Add padding for node radius + labels
    const pad = 60;
    minX -= pad;
    maxX += pad;
    minY -= pad;
    maxY += pad;

    const bboxWidth = maxX - minX;
    const bboxHeight = maxY - minY;

    if (bboxWidth <= 0 || bboxHeight <= 0) return;

    const scale = Math.min(
      currentWidth / bboxWidth,
      height / bboxHeight,
      2 // don't zoom in too much
    ) * 0.9; // 90% to leave a small margin

    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const transform = d3.zoomIdentity
      .translate(currentWidth / 2, height / 2)
      .scale(scale)
      .translate(-centerX, -centerY);

    svg.transition().duration(500).call(zoomRef.current.transform as any, transform);
  }, [width]);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || concepts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const height = GRAPH_HEIGHT;

    // Arrow marker definitions for each relationship type
    const defs = svg.append("defs");
    const relationshipTypes = ["requires", "supports", "example_of", "contradicts"];
    for (const rel of relationshipTypes) {
      defs
        .append("marker")
        .attr("id", `arrow-${rel}`)
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 20)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-4L10,0L0,4")
        .attr("fill", getLinkColor(rel));
    }

    const canonicalConcepts = buildCanonicalConcepts(concepts);
    const nodes: GraphNode[] = Array.from(canonicalConcepts.entries()).map(
      ([key, c]) => ({
      id: key,
      name: c.name,
      mastery: c.mastery_score,
      status: c.status,
    }));

    nodesRef.current = nodes;

    const nodeNames = new Set(nodes.map((n) => n.id));

    const links: GraphLink[] = relationships
      .map((r) => {
        const source = conceptIdentityKey(r.from_concept);
        const target = conceptIdentityKey(r.to_concept);
        return {
          ...r,
          source,
          target,
        };
      })
      .filter((r) => nodeNames.has(r.source) && nodeNames.has(r.target))
      .filter((r) => r.source !== r.target)
      .map((r) => ({
        source: r.source,
        target: r.target,
        relationship: r.relationship,
        reasoning: r.reasoning,
      }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(100)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(40))
      // Keep nodes from drifting too far from center
      .force("x", d3.forceX(width / 2).strength(0.05))
      .force("y", d3.forceY(height / 2).strength(0.05));

    // Zoom
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom as any);
    zoomRef.current = zoom;

    // Tooltip reference
    const tooltip = tooltipRef.current;

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", (d) => getLinkColor(d.relationship))
      .attr("stroke-opacity", 0.4)
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => getLinkStyle(d.relationship))
      .attr("marker-end", (d) => `url(#arrow-${d.relationship})`)
      .style("cursor", "pointer")
      .on("mouseenter", (event: MouseEvent, d: GraphLink) => {
        if (!tooltip) return;
        const label = d.relationship.replace("_", " ");
        const reasoning = d.reasoning ? `\n${d.reasoning}` : "";
        tooltip.textContent = `${label}${reasoning}`;
        tooltip.style.opacity = "1";
        tooltip.style.left = `${event.offsetX + 10}px`;
        tooltip.style.top = `${event.offsetY - 10}px`;

        // Highlight on hover
        d3.select(event.currentTarget as Element)
          .attr("stroke-opacity", 0.9)
          .attr("stroke-width", 2.5);
      })
      .on("mouseleave", (event: MouseEvent) => {
        if (tooltip) tooltip.style.opacity = "0";
        d3.select(event.currentTarget as Element)
          .attr("stroke-opacity", 0.4)
          .attr("stroke-width", 1.5);
      });

    // Node groups
    const node = g
      .append("g")
      .selectAll("g")
      .data(nodes)
      .join("g")
      .call(
        d3
          .drag<SVGGElement, GraphNode>()
          .on("start", (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on("drag", (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on("end", (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as any
      );

    // Node glow
    node
      .append("circle")
      .attr("r", (d) => 12 + (d.mastery / 100) * 10)
      .attr("fill", (d) => getNodeColor(d.mastery, d.status))
      .attr("opacity", 0.1);

    // Node circle
    node
      .append("circle")
      .attr("r", (d) => 8 + (d.mastery / 100) * 8)
      .attr("fill", (d) => getNodeColor(d.mastery, d.status))
      .attr("stroke", (d) => getNodeColor(d.mastery, d.status))
      .attr("stroke-width", 1.5)
      .attr("fill-opacity", 0.3)
      .style("cursor", "pointer");

    // Label background rects (added before text for readability)
    node.append("rect")
      .attr("fill", "hsl(var(--card))")
      .attr("fill-opacity", 0.8)
      .attr("rx", 3)
      .attr("ry", 3)
      .attr("pointer-events", "none");

    // Labels
    const label = node
      .append("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => (10 + (d.mastery / 100) * 8) + 14)
      .attr("fill", "#94a3b8")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("pointer-events", "none");

    // Size the background rects to fit the text
    label.each(function () {
      const bbox = (this as SVGTextElement).getBBox();
      const parent = (this as SVGTextElement).parentElement;
      if (parent) {
        const bg = d3.select(parent).select("rect");
        bg.attr("x", bbox.x - 3)
          .attr("y", bbox.y - 1)
          .attr("width", bbox.width + 6)
          .attr("height", bbox.height + 2);
      }
    });

    simulation.on("tick", () => {
      // Clamp node positions to keep them within reasonable bounds
      for (const d of nodes) {
        d.x = Math.max(NODE_PADDING, Math.min(width - NODE_PADDING, d.x ?? width / 2));
        d.y = Math.max(NODE_PADDING, Math.min(height - NODE_PADDING, d.y ?? height / 2));
      }

      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Auto zoom-to-fit once the simulation settles
    simulation.on("end", () => {
      zoomToFit();
    });

    return () => {
      simulation.stop();
    };
  }, [concepts, relationships, width, zoomToFit]);

  const handleZoomIn = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy as any, 1.4);
  }, []);

  const handleZoomOut = useCallback(() => {
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.transition().duration(300).call(zoomRef.current.scaleBy as any, 0.7);
  }, []);

  const handleZoomReset = useCallback(() => {
    zoomToFit();
  }, [zoomToFit]);

  const validLinks = getValidLinks(relationships, concepts);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Concept Map
        </h3>
        {concepts.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                Mastered
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                In Progress
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-destructive" />
                Gap
              </span>
            </div>
            <div className="flex items-center gap-0.5 border border-border rounded-lg overflow-hidden">
              <button
                onClick={handleZoomOut}
                className="p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Zoom out"
              >
                <ZoomOut className="h-3 w-3" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={handleZoomReset}
                className="p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Fit to view"
              >
                <Maximize2 className="h-3 w-3" />
              </button>
              <div className="w-px h-4 bg-border" />
              <button
                onClick={handleZoomIn}
                className="p-1.5 hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title="Zoom in"
              >
                <ZoomIn className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden relative">
        {concepts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <GitFork className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground mt-1">
                Concept connections will map here
              </p>
            </div>
          </div>
        ) : (
          <>
            <svg
              ref={svgRef}
              width={width}
              height={GRAPH_HEIGHT}
              viewBox={`0 0 ${width} ${GRAPH_HEIGHT}`}
              className="w-full"
            />
            {/* Tooltip */}
            <div
              ref={tooltipRef}
              className="absolute pointer-events-none bg-popover text-popover-foreground text-xs px-2.5 py-1.5 rounded-lg border border-border shadow-md max-w-[200px] whitespace-pre-wrap transition-opacity duration-150"
              style={{ opacity: 0 }}
            />
          </>
        )}
      </div>

      {/* Relationship type legend */}
      {concepts.length > 0 && validLinks.length > 0 && (
        <div className="flex items-center justify-center gap-5 mt-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#f59e0b" strokeWidth="2" /></svg>
            Requires
          </span>
          <span className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#4ade80" strokeWidth="2" strokeDasharray="5,3" /></svg>
            Supports
          </span>
          <span className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#60a5fa" strokeWidth="2" strokeDasharray="2,2" /></svg>
            Example of
          </span>
          <span className="flex items-center gap-2">
            <svg width="24" height="8"><line x1="0" y1="4" x2="24" y2="4" stroke="#f43f5e" strokeWidth="2" strokeDasharray="6,2,2,2" /></svg>
            Contradicts
          </span>
        </div>
      )}
    </div>
  );
}

/** Helper to check if there are valid links to show the legend */
function getValidLinks(
  relationships: ConceptRelationship[],
  concepts: Concept[]
): ConceptRelationship[] {
  const canonicalNames = new Set(
    concepts.map((c) => conceptIdentityKey(c.name)).filter(Boolean)
  );
  return relationships.filter((r) => {
    const from = conceptIdentityKey(r.from_concept);
    const to = conceptIdentityKey(r.to_concept);
    return (
      canonicalNames.has(from) &&
      canonicalNames.has(to) &&
      from !== to
    );
  });
}
