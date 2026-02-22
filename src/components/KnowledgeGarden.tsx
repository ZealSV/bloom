"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Sprout } from "lucide-react";
import type { Concept } from "@/hooks/useSession";
import { getFlowerStage, getFlowerColors } from "@/utils/gardenHelpers";

interface GardenGroup {
  topic: string;
  mastery_score: number;
  concepts: Concept[];
}

interface KnowledgeGardenProps {
  groups: GardenGroup[];
  subjectArea: string | null;
}

function Flower({
  concept,
  x,
  colors,
  index,
  subtopicCount,
}: {
  concept: { name: string; mastery_score: number };
  x: number;
  colors: { petal: string; center: string; stem: string };
  index: number;
  subtopicCount: number;
}) {
  const [hovered, setHovered] = useState(false);
  const stage = getFlowerStage(concept.mastery_score);
  const groundY = 180;

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ cursor: "pointer" }}
    >
      {/* Seed */}
      {stage === "seed" && (
        <motion.ellipse
          cx={x}
          cy={groundY + 5}
          rx={4}
          ry={3}
          fill={colors.stem}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: index * 0.1 }}
        />
      )}

      {/* Sprout */}
      {stage === "sprout" && (
        <g>
          <motion.line
            x1={x}
            y1={groundY}
            x2={x}
            y2={groundY - 25}
            stroke={colors.stem}
            strokeWidth={2}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          />
          <motion.ellipse
            cx={x + 6}
            cy={groundY - 20}
            rx={5}
            ry={3}
            fill={colors.stem}
            opacity={0.7}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: -30 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            style={{ transformOrigin: `${x}px ${groundY - 20}px` }}
          />
        </g>
      )}

      {/* Growing */}
      {stage === "growing" && (
        <g>
          <motion.line
            x1={x}
            y1={groundY}
            x2={x}
            y2={groundY - 50}
            stroke={colors.stem}
            strokeWidth={2.5}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          />
          {/* Leaves */}
          <motion.ellipse
            cx={x + 8}
            cy={groundY - 25}
            rx={7}
            ry={3.5}
            fill={colors.stem}
            opacity={0.7}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: -25 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            style={{ transformOrigin: `${x}px ${groundY - 25}px` }}
          />
          <motion.ellipse
            cx={x - 8}
            cy={groundY - 35}
            rx={7}
            ry={3.5}
            fill={colors.stem}
            opacity={0.7}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 25 }}
            transition={{ delay: 0.4 + index * 0.1 }}
            style={{ transformOrigin: `${x}px ${groundY - 35}px` }}
          />
          {/* Small bud */}
          <motion.circle
            cx={x}
            cy={groundY - 52}
            r={5}
            fill={colors.petal}
            opacity={0.6}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + index * 0.1, type: "spring" }}
          />
        </g>
      )}

      {/* blooming */}
      {stage === "blooming" && (
        <g>
          <motion.line
            x1={x}
            y1={groundY}
            x2={x}
            y2={groundY - 65}
            stroke={colors.stem}
            strokeWidth={3}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
          />
          {/* Leaves */}
          <motion.ellipse
            cx={x + 10}
            cy={groundY - 30}
            rx={8}
            ry={4}
            fill={colors.stem}
            opacity={0.8}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ transformOrigin: `${x}px ${groundY - 30}px`, rotate: -25 }}
          />
          <motion.ellipse
            cx={x - 10}
            cy={groundY - 42}
            rx={8}
            ry={4}
            fill={colors.stem}
            opacity={0.8}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            style={{ transformOrigin: `${x}px ${groundY - 42}px`, rotate: 25 }}
          />
          {/* Petals with organic curves and depth */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <motion.path
              key={angle}
              d={`M ${x} ${groundY - 68} Q ${x + Math.cos(((angle - 20) * Math.PI) / 180) * 15} ${groundY - 68 + Math.sin(((angle - 20) * Math.PI) / 180) * 15} ${x + Math.cos((angle * Math.PI) / 180) * 20} ${groundY - 68 + Math.sin((angle * Math.PI) / 180) * 20} Q ${x + Math.cos(((angle + 20) * Math.PI) / 180) * 15} ${groundY - 68 + Math.sin(((angle + 20) * Math.PI) / 180) * 15} ${x} ${groundY - 68}`}
              fill={colors.petal}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.8 }}
              transition={{ delay: 0.3 + (angle / 360) * 0.3, type: "spring", stiffness: 100 }}
              style={{ transformOrigin: `${x}px ${groundY - 68}px`, rotate: angle }}
            />
          ))}
          {/* Pulsing Center */}
          <motion.circle
            cx={x}
            cy={groundY - 68}
            r={6}
            fill={colors.center}
            initial={{ scale: 0 }}
            animate={{ scale: [1, 1.15, 1] }}
            transition={{
              scale: { duration: 2, repeat: Infinity, ease: "easeInOut" },
              default: { delay: 0.6, type: "spring" }
            }}
          />
        </g>
      )}

      {/* Full bloom */}
      {stage === "full" && (
        <g>
          {/* Subtle glow behind full blooms */}
          <motion.circle
            cx={x}
            cy={groundY - 84}
            r={25}
            fill={colors.petal}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0.05, 0.15, 0.05] }}
            transition={{ duration: 3, repeat: Infinity }}
          />

          <motion.g
            animate={{ rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            style={{ transformOrigin: `${x}px ${groundY}px` }}
          >
            <line
              x1={x}
              y1={groundY}
              x2={x}
              y2={groundY - 80}
              stroke={colors.stem}
              strokeWidth={3}
              strokeLinecap="round"
            />
            {/* Leaves with detail */}
            <ellipse
              cx={x + 12}
              cy={groundY - 30}
              rx={12}
              ry={5}
              fill={colors.stem}
              opacity={0.9}
              transform={`rotate(-20, ${x + 12}, ${groundY - 30})`}
            />
            <ellipse
              cx={x - 12}
              cy={groundY - 45}
              rx={12}
              ry={5}
              fill={colors.stem}
              opacity={0.9}
              transform={`rotate(20, ${x - 12}, ${groundY - 45})`}
            />

            {/* Double layered petals for richness - Organic paths */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <g key={angle}>
                {/* Outer petals */}
                <motion.path
                  d={`M ${x} ${groundY - 84} Q ${x + Math.cos(((angle - 22) * Math.PI) / 180) * 22} ${groundY - 84 + Math.sin(((angle - 22) * Math.PI) / 180) * 22} ${x + Math.cos((angle * Math.PI) / 180) * 28} ${groundY - 84 + Math.sin((angle * Math.PI) / 180) * 28} Q ${x + Math.cos(((angle + 22) * Math.PI) / 180) * 22} ${groundY - 84 + Math.sin(((angle + 22) * Math.PI) / 180) * 22} ${x} ${groundY - 84}`}
                  fill={colors.petal}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.9 }}
                  transition={{ delay: (angle / 360) * 0.4, type: "spring" }}
                  style={{ transformOrigin: `${x}px ${groundY - 84}px`, rotate: angle }}
                />
                {/* Inner smaller petals */}
                <motion.path
                  d={`M ${x} ${groundY - 84} Q ${x + Math.cos(((angle - 15) * Math.PI) / 180) * 12} ${groundY - 84 + Math.sin(((angle - 15) * Math.PI) / 180) * 12} ${x + Math.cos((angle * Math.PI) / 180) * 16} ${groundY - 84 + Math.sin((angle * Math.PI) / 180) * 16} Q ${x + Math.cos(((angle + 15) * Math.PI) / 180) * 12} ${groundY - 84 + Math.sin(((angle + 15) * Math.PI) / 180) * 12} ${x} ${groundY - 84}`}
                  fill={colors.center}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.5 }}
                  transition={{ delay: 0.2 + (angle / 360) * 0.4, type: "spring" }}
                  style={{ transformOrigin: `${x}px ${groundY - 84}px`, rotate: angle }}
                />
              </g>
            ))}

            <motion.circle
              cx={x}
              cy={groundY - 84}
              r={9}
              fill={colors.center}
              animate={{ scale: [1, 1.1, 1], filter: ["brightness(1)", "brightness(1.2)", "brightness(1)"] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Ambient magic particles */}
            {[0, 1, 2].map((pi) => {
              const offsetX = ((pi * 23 + index * 37) % 40) - 20;
              const offsetY = ((pi * 41 + index * 13) % 40) - 20;
              const moveX = ((pi * 17 + index * 19) % 20) - 10;
              return (
                <motion.circle
                  key={`particle-${pi}`}
                  cx={x + offsetX}
                  cy={groundY - 84 + offsetY}
                  r={1}
                  fill="#fff"
                  animate={{
                    y: [0, -20, -40],
                    x: [0, moveX, moveX * 2],
                    opacity: [0, 0.8, 0]
                  }}
                  transition={{
                    duration: 2 + (pi % 2),
                    repeat: Infinity,
                    delay: pi * 0.5
                  }}
                />
              );
            })}
          </motion.g>
        </g>
      )}

      {/* Subtopic leaves */}
      {subtopicCount > 0 && (
        <g>
          {Array.from({ length: Math.min(subtopicCount, 8) }).map((_, i) => {
            const count = Math.min(subtopicCount, 8);
            const offset = (i - (count - 1) / 2) * 16;
            const tier = i % 3;
            const baseY =
              stage === "full"
                ? groundY - 40
                : stage === "blooming"
                  ? groundY - 36
                  : stage === "growing"
                    ? groundY - 30
                    : stage === "sprout"
                      ? groundY - 22
                      : groundY - 16;
            const leafY = baseY + tier * 10;
            const rotation = offset < 0 ? -30 - tier * 6 : 30 + tier * 6;
            return (
              <motion.ellipse
                key={`leaf-${i}`}
                cx={x + offset}
                cy={leafY}
                rx={7}
                ry={3.2}
                fill={colors.stem}
                opacity={0.7}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2 + i * 0.05 }}
                style={{
                  transformOrigin: `${x + offset}px ${leafY}px`,
                  rotate: rotation,
                }}
              />
            );
          })}
          {subtopicCount > 8 && (
            <text
              x={x}
              y={
                stage === "full"
                  ? groundY - 58
                  : stage === "blooming"
                    ? groundY - 50
                    : stage === "growing"
                      ? groundY - 44
                      : stage === "sprout"
                        ? groundY - 32
                        : groundY - 26
              }
              textAnchor="middle"
              fill="rgba(255,255,255,0.7)"
              fontSize={8}
              fontWeight="600"
              fontFamily="Inter, sans-serif"
            >
              +{subtopicCount - 8}
            </text>
          )}
        </g>
      )}

      {/* Tooltip */}
      {hovered && (
        <motion.g initial={{ opacity: 0, y: 5, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <rect
            x={x - 60}
            y={
              groundY -
              (stage === "full" ? 130 : stage === "blooming" ? 110 : 95)
            }
            width={120}
            height={32}
            rx={8}
            fill="rgba(10, 20, 10, 0.95)"
            stroke="rgba(74, 222, 128, 0.3)"
            strokeWidth={1}
            className="shadow-2xl"
          />
          <text
            x={x}
            y={
              groundY -
              (stage === "full" ? 113 : stage === "blooming" ? 93 : 78)
            }
            textAnchor="middle"
            fill="#fff"
            fontSize={11}
            fontWeight="500"
            fontFamily="Outfit, sans-serif"
          >
            {concept.name}
          </text>
          <text
            x={x}
            y={
              groundY - (stage === "full" ? 101 : stage === "blooming" ? 81 : 66)
            }
            textAnchor="middle"
            fill="#4ade80"
            fontSize={9}
            fontWeight="600"
            fontFamily="Inter, sans-serif"
          >
            {Math.round(concept.mastery_score)}% PROFICIENCY · {subtopicCount} subtopic{subtopicCount !== 1 ? "s" : ""}
          </text>
        </motion.g>
      )}
    </g>
  );
}

export default function KnowledgeGarden({
  groups,
  subjectArea,
}: KnowledgeGardenProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const width = 400;
  const height = 220;
  const groundY = 180;
  const colors = getFlowerColors(subjectArea);

  // Position flowers evenly
  const spacing = Math.min(90, (width - 60) / Math.max(groups.length, 1));
  const startX =
    groups.length > 0
      ? (width - spacing * (groups.length - 1)) / 2
      : width / 2;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Knowledge Garden
        </h3>
        <span className="text-[10px] text-muted-foreground/60">
          {groups.length} topic{groups.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl bg-gradient-to-b from-card/50 to-card border border-border overflow-hidden">
        {groups.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <Sprout className="h-6 w-6 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground mt-1">
                Start teaching to grow your garden
              </p>
            </div>
          </div>
        ) : (
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full"
            style={{ minHeight: 180 }}
          >
            {/* Sky background */}
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#050805" />
                <stop offset="60%" stopColor="#0a120a" />
                <stop offset="100%" stopColor="#111c11" />
              </linearGradient>
              <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a2e1a" />
                <stop offset="100%" stopColor="#0a0f0a" />
              </linearGradient>
              <radialGradient id="bloomGlow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="rgba(74, 222, 128, 0.15)" />
                <stop offset="100%" stopColor="transparent" />
              </radialGradient>
            </defs>

            <rect width={width} height={height} fill="url(#sky)" />

            {/* Bioluminescent "Mist" */}
            <motion.circle
              cx={width / 2}
              cy={groundY}
              r={120}
              fill="url(#bloomGlow)"
              animate={{ opacity: [0.4, 0.7, 0.4], scale: [1, 1.1, 1] }}
              transition={{ duration: 5, repeat: Infinity }}
            />

            {/* Stars/Pollen with depth of field */}
            {mounted && Array.from({ length: 20 }).map((_, i) => (
              <motion.circle
                key={i}
                cx={(i * 137 + 41) % width}
                cy={(i * 67 + 13) % (groundY - 20)}
                r={0.4 + (i % 3) * 0.4}
                fill="#fff"
                animate={{
                  opacity: [0.1, 0.4, 0.1],
                  y: [0, (i % 2 === 0 ? 5 : -5), 0],
                  x: [0, (i % 3 === 0 ? 3 : -3), 0],
                }}
                transition={{
                  duration: 3 + (i % 4),
                  repeat: Infinity,
                  delay: (i % 5),
                }}
                style={{
                  filter: `blur(${(i % 2) * 1}px)`,
                  opacity: 0.3 + (i % 4) * 0.1
                }}
              />
            ))}

            {/* Ground */}
            <rect
              x={0}
              y={groundY}
              width={width}
              height={height - groundY}
              fill="url(#ground)"
            />
            <line
              x1={0}
              y1={groundY}
              x2={width}
              y2={groundY}
              stroke="rgba(74,222,128,0.2)"
              strokeWidth={1}
            />

            {/* Grass tufts */}
            {Array.from({ length: 12 }).map((_, i) => {
              const xPos = 20 + i * 32 + (i * 7) % 10;
              const gHeight = 4 + (i * 11) % 5;
              const slant = (i % 2 === 0 ? 3 : -3);
              return (
                <motion.line
                  key={`grass-${i}`}
                  x1={xPos}
                  y1={groundY}
                  x2={xPos + slant}
                  y2={groundY - gHeight}
                  stroke="rgba(74,222,128,0.15)"
                  strokeWidth={1}
                  strokeLinecap="round"
                  animate={{ rotate: [-2, 2, -2] }}
                  transition={{ duration: 2 + (i % 2), repeat: Infinity }}
                  style={{
                    transformOrigin: `${xPos}px ${groundY}px`,
                  }}
                />
              );
            })}

            {/* Flowers */}
            {groups.map((group, i) => (
              <Flower
                key={`${group.topic}-${i}`}
                concept={{ name: group.topic, mastery_score: group.mastery_score }}
                x={startX + i * spacing}
                colors={colors}
                index={i}
                subtopicCount={group.concepts.length}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
