"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import type { Concept } from "@/hooks/useSession";
import { getFlowerStage, getFlowerColors } from "@/utils/gardenHelpers";

interface KnowledgeGardenProps {
  concepts: Concept[];
  subjectArea: string | null;
}

function Flower({
  concept,
  x,
  colors,
  index,
}: {
  concept: Concept;
  x: number;
  colors: { petal: string; center: string; stem: string };
  index: number;
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
            opacity={0.7}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: -25 }}
            style={{ transformOrigin: `${x}px ${groundY - 30}px` }}
          />
          <motion.ellipse
            cx={x - 10}
            cy={groundY - 42}
            rx={8}
            ry={4}
            fill={colors.stem}
            opacity={0.7}
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: 25 }}
            style={{ transformOrigin: `${x}px ${groundY - 42}px` }}
          />
          {/* Petals */}
          {[0, 60, 120, 180, 240, 300].map((angle) => (
            <motion.ellipse
              key={angle}
              cx={x + Math.cos((angle * Math.PI) / 180) * 10}
              cy={groundY - 68 + Math.sin((angle * Math.PI) / 180) * 10}
              rx={6}
              ry={4}
              fill={colors.petal}
              opacity={0.8}
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: angle }}
              transition={{ delay: 0.3 + (angle / 360) * 0.3, type: "spring" }}
              style={{ transformOrigin: `${x}px ${groundY - 68}px` }}
            />
          ))}
          <motion.circle
            cx={x}
            cy={groundY - 68}
            r={5}
            fill={colors.center}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          />
        </g>
      )}

      {/* Full bloom */}
      {stage === "full" && (
        <g>
          {/* Sway animation on stem */}
          <motion.g
            animate={{ rotate: [-1, 1, -1] }}
            transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
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
            {/* Leaves */}
            <ellipse
              cx={x + 12}
              cy={groundY - 30}
              rx={10}
              ry={5}
              fill={colors.stem}
              opacity={0.8}
              transform={`rotate(-20, ${x}, ${groundY - 30})`}
            />
            <ellipse
              cx={x - 12}
              cy={groundY - 45}
              rx={10}
              ry={5}
              fill={colors.stem}
              opacity={0.8}
              transform={`rotate(20, ${x}, ${groundY - 45})`}
            />
            <ellipse
              cx={x + 8}
              cy={groundY - 58}
              rx={7}
              ry={3.5}
              fill={colors.stem}
              opacity={0.6}
              transform={`rotate(-15, ${x}, ${groundY - 58})`}
            />
            {/* Large petals */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => (
              <motion.ellipse
                key={angle}
                cx={x + Math.cos((angle * Math.PI) / 180) * 14}
                cy={groundY - 84 + Math.sin((angle * Math.PI) / 180) * 14}
                rx={9}
                ry={5}
                fill={colors.petal}
                opacity={0.9}
                transform={`rotate(${angle}, ${x}, ${groundY - 84})`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: (angle / 360) * 0.4, type: "spring" }}
              />
            ))}
            {/* Glow effect */}
            <motion.circle
              cx={x}
              cy={groundY - 84}
              r={20}
              fill={colors.petal}
              opacity={0.08}
              animate={{ r: [18, 22, 18], opacity: [0.06, 0.12, 0.06] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
            <circle cx={x} cy={groundY - 84} r={7} fill={colors.center} />
            {/* Sparkle */}
            <motion.circle
              cx={x + 15}
              cy={groundY - 95}
              r={1.5}
              fill="#fbbf24"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
            />
            <motion.circle
              cx={x - 12}
              cy={groundY - 90}
              r={1}
              fill="#fbbf24"
              animate={{ opacity: [0, 1, 0], scale: [0.5, 1.2, 0.5] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            />
          </motion.g>
        </g>
      )}

      {/* Tooltip */}
      {hovered && (
        <motion.g initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}>
          <rect
            x={x - 50}
            y={
              groundY -
              (stage === "full" ? 120 : stage === "blooming" ? 100 : 85)
            }
            width={100}
            height={28}
            rx={6}
            fill="#1a2a1a"
            stroke="rgba(74,222,128,0.2)"
            strokeWidth={1}
          />
          <text
            x={x}
            y={
              groundY -
              (stage === "full" ? 107 : stage === "blooming" ? 87 : 72)
            }
            textAnchor="middle"
            fill="#e2e8f0"
            fontSize={10}
            fontFamily="Inter, sans-serif"
          >
            {concept.name}
          </text>
          <text
            x={x}
            y={
              groundY - (stage === "full" ? 95 : stage === "blooming" ? 75 : 60)
            }
            textAnchor="middle"
            fill="#4ade80"
            fontSize={9}
            fontFamily="Inter, sans-serif"
          >
            {Math.round(concept.mastery_score)}% mastery
          </text>
        </motion.g>
      )}
    </g>
  );
}

export default function KnowledgeGarden({
  concepts,
  subjectArea,
}: KnowledgeGardenProps) {
  const width = 400;
  const height = 220;
  const groundY = 180;
  const colors = getFlowerColors(subjectArea);

  // Position flowers evenly
  const spacing = Math.min(70, (width - 60) / Math.max(concepts.length, 1));
  const startX =
    concepts.length > 0
      ? (width - spacing * (concepts.length - 1)) / 2
      : width / 2;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Knowledge Garden
        </h3>
        <span className="text-[10px] text-muted-foreground/60">
          {concepts.length} concept{concepts.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="rounded-xl bg-gradient-to-b from-card/50 to-card border border-border overflow-hidden">
        {concepts.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <span className="text-2xl opacity-30">🌱</span>
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
            {/* Sky gradient */}
            <defs>
              <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0a0f0a" />
                <stop offset="100%" stopColor="#111a11" />
              </linearGradient>
              <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#1a2a1a" />
                <stop offset="100%" stopColor="#0f1a0f" />
              </linearGradient>
            </defs>

            <rect width={width} height={height} fill="url(#sky)" />

            {/* Stars */}
            {[
              [30, 20],
              [120, 35],
              [250, 15],
              [340, 40],
              [80, 45],
              [300, 25],
            ].map(([sx, sy], i) => (
              <motion.circle
                key={i}
                cx={sx}
                cy={sy}
                r={0.8}
                fill="#94a3b8"
                animate={{ opacity: [0.2, 0.6, 0.2] }}
                transition={{
                  duration: 2 + i * 0.5,
                  repeat: Infinity,
                  delay: i * 0.3,
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
              stroke="rgba(74,222,128,0.1)"
              strokeWidth={1}
            />

            {/* Grass tufts */}
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.line
                key={`grass-${i}`}
                x1={20 + i * 32 + Math.random() * 10}
                y1={groundY}
                x2={
                  20 +
                  i * 32 +
                  Math.random() * 10 +
                  (Math.random() > 0.5 ? 3 : -3)
                }
                y2={groundY - 4 - Math.random() * 4}
                stroke="rgba(74,222,128,0.15)"
                strokeWidth={1}
                strokeLinecap="round"
                animate={{ rotate: [-2, 2, -2] }}
                transition={{ duration: 2 + Math.random(), repeat: Infinity }}
                style={{
                  transformOrigin: `${20 + i * 32}px ${groundY}px`,
                }}
              />
            ))}

            {/* Flowers */}
            {concepts.map((concept, i) => (
              <Flower
                key={concept.id}
                concept={concept}
                x={startX + i * spacing}
                colors={colors}
                index={i}
              />
            ))}
          </svg>
        )}
      </div>
    </div>
  );
}
