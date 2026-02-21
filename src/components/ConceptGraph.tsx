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

export default function ConceptGraph({
  concepts,
  relationships,
}: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const [width, setWidth] = useState(400);

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

    const nodes: GraphNode[] = concepts.map((c) => ({
      id: c.name,
      name: c.name,
      mastery: c.mastery_score,
      status: c.status,
    }));

    const nodeNames = new Set(nodes.map((n) => n.id));

    const links: GraphLink[] = relationships
      .filter(
        (r) =>
          nodeNames.has(r.from_concept) && nodeNames.has(r.to_concept)
      )
      .map((r) => ({
        source: r.from_concept,
        target: r.to_concept,
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
      .force("collision", d3.forceCollide().radius(35));

    // Zoom
    const g = svg.append("g");
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
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

    // Labels
    node
      .append("text")
      .text((d) => d.name)
      .attr("text-anchor", "middle")
      .attr("dy", (d) => -(10 + (d.mastery / 100) * 8))
      .attr("fill", "#94a3b8")
      .attr("font-size", "11px")
      .attr("font-family", "Inter, sans-serif")
      .attr("pointer-events", "none");

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    return () => {
      simulation.stop();
    };
  }, [concepts, relationships, width]);

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
    if (!svgRef.current || !zoomRef.current) return;
    const svg = d3.select(svgRef.current);
    svg
      .transition()
      .duration(300)
      .call(zoomRef.current.transform as any, d3.zoomIdentity);
  }, []);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Concept Map
        </h3>
        {concepts.length > 0 && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground/60">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-primary" />
                Mastered
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                In Progress
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-destructive" />
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
                title="Reset zoom"
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
      {concepts.length > 0 && links(relationships, concepts).length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-2 text-[9px] text-muted-foreground/60">
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#f59e0b" strokeWidth="1.5" /></svg>
            requires
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#4ade80" strokeWidth="1.5" strokeDasharray="4,2" /></svg>
            supports
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#60a5fa" strokeWidth="1.5" strokeDasharray="2,2" /></svg>
            example of
          </span>
          <span className="flex items-center gap-1.5">
            <svg width="16" height="6"><line x1="0" y1="3" x2="16" y2="3" stroke="#f43f5e" strokeWidth="1.5" strokeDasharray="6,2,2,2" /></svg>
            contradicts
          </span>
        </div>
      )}
    </div>
  );
}

/** Helper to check if there are valid links to show the legend */
function links(relationships: ConceptRelationship[], concepts: Concept[]): ConceptRelationship[] {
  const names = new Set(concepts.map((c) => c.name));
  return relationships.filter((r) => names.has(r.from_concept) && names.has(r.to_concept));
}
