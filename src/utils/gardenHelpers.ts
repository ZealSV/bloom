// Flower color palettes by subject area
export const SUBJECT_COLORS: Record<
  string,
  { petal: string; center: string; stem: string }
> = {
  Biology: { petal: "#4ade80", center: "#fbbf24", stem: "#22c55e" },
  "Computer Science": { petal: "#60a5fa", center: "#a78bfa", stem: "#3b82f6" },
  Math: { petal: "#a78bfa", center: "#f472b6", stem: "#8b5cf6" },
  Physics: { petal: "#fbbf24", center: "#f97316", stem: "#eab308" },
  Chemistry: { petal: "#22d3ee", center: "#06b6d4", stem: "#0891b2" },
  History: { petal: "#fb923c", center: "#f43f5e", stem: "#ea580c" },
  Literature: { petal: "#f472b6", center: "#e879f9", stem: "#ec4899" },
  Economics: { petal: "#34d399", center: "#fbbf24", stem: "#10b981" },
  Psychology: { petal: "#c084fc", center: "#f472b6", stem: "#a855f7" },
  Philosophy: { petal: "#94a3b8", center: "#e2e8f0", stem: "#64748b" },
};

const DEFAULT_COLORS = { petal: "#4ade80", center: "#fbbf24", stem: "#22c55e" };

export function getFlowerColors(subjectArea: string | null) {
  return SUBJECT_COLORS[subjectArea || ""] || DEFAULT_COLORS;
}

export type FlowerStage = "seed" | "sprout" | "growing" | "blooming" | "full";

export function getFlowerStage(mastery: number): FlowerStage {
  if (mastery <= 20) return "seed";
  if (mastery <= 40) return "sprout";
  if (mastery <= 60) return "growing";
  if (mastery <= 80) return "blooming";
  return "full";
}

// Position flowers in a garden layout
export function getFlowerPositions(count: number, width: number) {
  const positions: { x: number; y: number }[] = [];
  const spacing = Math.min(80, (width - 40) / Math.max(count, 1));
  const startX = (width - spacing * (count - 1)) / 2;

  for (let i = 0; i < count; i++) {
    positions.push({
      x: startX + i * spacing,
      y: 0, // will be relative to ground
    });
  }

  return positions;
}
