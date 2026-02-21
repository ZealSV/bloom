"use client";

import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Concept, Gap } from "@/hooks/useSession";

interface MasteryDashboardProps {
  concepts: Concept[];
  gaps: Gap[];
}

function getMasteryColor(score: number) {
  if (score >= 80) return "hsl(var(--primary))";
  if (score >= 60) return "hsl(var(--chart-5))";
  if (score >= 40) return "hsl(45 93% 50%)";
  return "hsl(var(--destructive))";
}

function getStatusBadge(status: string) {
  switch (status) {
    case "mastered":
      return { text: "Mastered", variant: "default" as const };
    case "tested":
      return { text: "Testing", variant: "secondary" as const };
    default:
      return { text: "Identified", variant: "outline" as const };
  }
}

export default function MasteryDashboard({
  concepts,
  gaps,
}: MasteryDashboardProps) {
  const overallMastery =
    concepts.length > 0
      ? Math.round(
          concepts.reduce((sum, c) => sum + c.mastery_score, 0) /
            concepts.length
        )
      : 0;

  const unresolvedGaps = gaps.filter((g) => !g.resolved);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Mastery
        </h3>
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <span className="text-2xl opacity-30">📊</span>
          <p className="text-xs text-muted-foreground mt-1">
            Concepts will appear as you teach
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">Overall Mastery</span>
              <span
                className="text-lg font-outfit font-semibold"
                style={{ color: getMasteryColor(overallMastery) }}
              >
                {overallMastery}%
              </span>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: getMasteryColor(overallMastery) }}
                initial={{ width: 0 }}
                animate={{ width: `${overallMastery}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {concepts
                .sort((a, b) => b.mastery_score - a.mastery_score)
                .map((concept) => {
                  const badge = getStatusBadge(concept.status);
                  const conceptGaps = unresolvedGaps.filter(
                    (g) =>
                      g.concept_name.toLowerCase() ===
                      concept.name.toLowerCase()
                  );

                  return (
                    <motion.div
                      key={concept.id}
                      layout
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="rounded-lg bg-card/50 border border-border p-2.5"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-foreground truncate">
                            {concept.name}
                          </span>
                          <Badge variant={badge.variant} className="text-[9px] px-1.5 py-0 h-4 shrink-0">
                            {badge.text}
                          </Badge>
                        </div>
                        <span
                          className="text-xs font-mono shrink-0 ml-2"
                          style={{ color: getMasteryColor(concept.mastery_score) }}
                        >
                          {Math.round(concept.mastery_score)}%
                        </span>
                      </div>

                      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{ background: getMasteryColor(concept.mastery_score) }}
                          initial={{ width: 0 }}
                          animate={{ width: `${concept.mastery_score}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>

                      {conceptGaps.length > 0 && (
                        <div className="mt-1.5">
                          {conceptGaps.map((gap) => (
                            <div key={gap.id} className="flex items-start gap-1.5 mt-1">
                              <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                              <span className="text-[10px] text-destructive/80 leading-tight">
                                {gap.description}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  );
}
