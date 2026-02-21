"use client";

import { useEffect, useRef, useState } from "react";
import * as d3 from "d3";
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
}

function getNodeColor(mastery: number, status: string): string {
  if (status === "mastered" || mastery >= 80) return "#4ade80";
  if (mastery >= 40) return "#fbbf24";
  if (mastery > 0) return "#f43f5e";
  return "#475569";
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

export default function ConceptGraph({
  concepts,
  relationships,
}: ConceptGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.max(entry.contentRect.height, 250),
        });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current || concepts.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const { width, height } = dimensions;

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
      }));

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        "link",
        d3
          .forceLink<GraphNode, GraphLink>(links)
          .id((d) => d.id)
          .distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-150))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(30));

    // Zoom
    const g = svg.append("g");
    svg.call(
      d3
        .zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.3, 3])
        .on("zoom", (event) => {
          g.attr("transform", event.transform);
        }) as any
    );

    // Links
    const link = g
      .append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "rgba(74,222,128,0.15)")
      .attr("stroke-width", 1.5)
      .attr("stroke-dasharray", (d) => getLinkStyle(d.relationship));

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
      .attr("r", (d) => 10 + (d.mastery / 100) * 10)
      .attr("fill", (d) => getNodeColor(d.mastery, d.status))
      .attr("opacity", 0.1);

    // Node circle
    node
      .append("circle")
      .attr("r", (d) => 6 + (d.mastery / 100) * 6)
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
      .attr("font-size", "9px")
      .attr("font-family", "Inter, sans-serif");

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
  }, [concepts, relationships, dimensions]);

  return (
    <div className="w-full" ref={containerRef}>
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Concept Map
        </h3>
        {concepts.length > 0 && (
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
        )}
      </div>

      <div className="rounded-xl bg-card border border-border overflow-hidden">
        {concepts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <span className="text-2xl opacity-30">🔗</span>
              <p className="text-xs text-muted-foreground mt-1">
                Concept connections will map here
              </p>
            </div>
          </div>
        ) : (
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
            className="w-full"
            style={{ minHeight: 250 }}
          />
        )}
      </div>
    </div>
  );
}
