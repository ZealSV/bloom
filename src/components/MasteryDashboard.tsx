"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, BarChart3, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Concept, Gap } from "@/hooks/useSession";

interface SessionInfo {
  id: string;
  topic: string;
  subject_area: string | null;
}

interface MasteryDashboardProps {
  concepts: Concept[];
  gaps: Gap[];
  sessions?: SessionInfo[];
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

interface ConceptGroup {
  label: string;
  concepts: Concept[];
  mastery: number;
}

export default function MasteryDashboard({
  concepts,
  gaps,
  sessions,
}: MasteryDashboardProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const overallMastery =
    concepts.length > 0
      ? Math.round(
          concepts.reduce((sum, c) => sum + c.mastery_score, 0) /
            concepts.length
        )
      : 0;

  const unresolvedGaps = gaps.filter((g) => !g.resolved);

  // Build a session lookup: session_id → topic or subject_area
  const sessionLookup = useMemo(() => {
    const map = new Map<string, string>();
    if (sessions) {
      for (const s of sessions) {
        map.set(s.id, s.subject_area || s.topic);
      }
    }
    return map;
  }, [sessions]);

  // Group concepts by subject/topic
  const groups: ConceptGroup[] = useMemo(() => {
    if (!sessions || sessions.length === 0) {
      // No sessions info — show flat list as a single group
      if (concepts.length === 0) return [];
      const mastery = Math.round(
        concepts.reduce((s, c) => s + c.mastery_score, 0) / concepts.length
      );
      return [{ label: "All Concepts", concepts, mastery }];
    }

    const groupMap = new Map<string, Concept[]>();
    for (const c of concepts) {
      const label = sessionLookup.get(c.session_id) || "Other";
      const list = groupMap.get(label) || [];
      list.push(c);
      groupMap.set(label, list);
    }

    return Array.from(groupMap.entries())
      .map(([label, groupConcepts]) => ({
        label,
        concepts: groupConcepts.sort(
          (a, b) => b.mastery_score - a.mastery_score
        ),
        mastery: Math.round(
          groupConcepts.reduce((s, c) => s + c.mastery_score, 0) /
            groupConcepts.length
        ),
      }))
      .sort((a, b) => b.concepts.length - a.concepts.length);
  }, [concepts, sessions, sessionLookup]);

  const toggleGroup = (label: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(label)) {
        next.delete(label);
      } else {
        next.add(label);
      }
      return next;
    });
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Mastery
        </h3>
      </div>

      {concepts.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-6 text-center">
          <BarChart3 className="h-6 w-6 text-muted-foreground/30 mx-auto" />
          <p className="text-xs text-muted-foreground mt-1">
            Concepts will appear as you teach
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Overall mastery bar */}
          <div className="rounded-xl bg-card border border-border p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                Overall Mastery
              </span>
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

          {/* Grouped concept list */}
          <div className="space-y-2">
            {groups.map((group) => {
              const isExpanded = expandedGroups.has(group.label);

              return (
                <div
                  key={group.label}
                  className="rounded-xl border border-border overflow-hidden"
                >
                  {/* Group header */}
                  <button
                    onClick={() => toggleGroup(group.label)}
                    className="w-full flex items-center justify-between p-3 bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-sm font-medium text-foreground truncate">
                        {group.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {group.concepts.length}{" "}
                        {group.concepts.length === 1 ? "concept" : "concepts"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span
                        className="text-sm font-mono font-medium"
                        style={{ color: getMasteryColor(group.mastery) }}
                      >
                        {group.mastery}%
                      </span>
                      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            background: getMasteryColor(group.mastery),
                          }}
                          initial={{ width: 0 }}
                          animate={{ width: `${group.mastery}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                        />
                      </div>
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Expanded concepts */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="px-3 pb-3 space-y-1.5">
                          {group.concepts.map((concept) => {
                            const badge = getStatusBadge(concept.status);
                            const conceptGaps = unresolvedGaps.filter(
                              (g) =>
                                g.concept_name.toLowerCase() ===
                                concept.name.toLowerCase()
                            );

                            return (
                              <div
                                key={concept.id}
                                className="rounded-lg bg-muted/30 border border-border/50 p-2.5"
                              >
                                <div className="flex items-center justify-between mb-1.5">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="text-xs text-foreground truncate">
                                      {concept.name}
                                    </span>
                                    <Badge
                                      variant={badge.variant}
                                      className="text-[9px] px-1.5 py-0 h-4 shrink-0"
                                    >
                                      {badge.text}
                                    </Badge>
                                  </div>
                                  <span
                                    className="text-xs font-mono shrink-0 ml-2"
                                    style={{
                                      color: getMasteryColor(
                                        concept.mastery_score
                                      ),
                                    }}
                                  >
                                    {Math.round(concept.mastery_score)}%
                                  </span>
                                </div>

                                <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                                  <motion.div
                                    className="h-full rounded-full"
                                    style={{
                                      background: getMasteryColor(
                                        concept.mastery_score
                                      ),
                                    }}
                                    initial={{ width: 0 }}
                                    animate={{
                                      width: `${concept.mastery_score}%`,
                                    }}
                                    transition={{
                                      duration: 0.6,
                                      ease: "easeOut",
                                    }}
                                  />
                                </div>

                                {conceptGaps.length > 0 && (
                                  <div className="mt-1.5">
                                    {conceptGaps.map((gap) => (
                                      <div
                                        key={gap.id}
                                        className="flex items-start gap-1.5 mt-1"
                                      >
                                        <AlertTriangle className="h-3 w-3 text-destructive mt-0.5 shrink-0" />
                                        <span className="text-[10px] text-destructive/80 leading-tight">
                                          {gap.description}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
