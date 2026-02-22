"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Sprout, BarChart3, GitFork } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import KnowledgeGarden from "@/components/KnowledgeGarden";
import MasteryDashboard from "@/components/MasteryDashboard";
import ConceptGraph from "@/components/ConceptGraph";
import { createClient } from "@/lib/supabase-browser";
import type { Concept, Gap, ConceptRelationship } from "@/hooks/useSession";

interface SessionRow {
  id: string;
  topic: string;
  subject_area: string | null;
  updated_at: string;
}

function normalizeConceptName(name: string): string {
  return name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function deduplicateConcepts(concepts: Concept[]): Concept[] {
  const map = new Map<string, Concept>();
  for (const c of concepts) {
    const key = normalizeConceptName(c.name);
    const existing = map.get(key);
    if (!existing || c.mastery_score > existing.mastery_score) {
      map.set(key, c);
    }
  }
  return Array.from(map.values());
}

function deduplicateGaps(gaps: Gap[]): Gap[] {
  const seen = new Set<string>();
  return gaps.filter((g) => {
    const key = `${g.concept_name.toLowerCase()}::${g.resolved}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deduplicateRelationships(
  rels: ConceptRelationship[]
): ConceptRelationship[] {
  const seen = new Set<string>();
  return rels.filter((r) => {
    const key = `${r.from_concept.toLowerCase()}::${r.to_concept.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export default function DashboardPage() {
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [gardenGroups, setGardenGroups] = useState<
    { topic: string; mastery_score: number; concepts: Concept[] }[]
  >([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [relationships, setRelationships] = useState<ConceptRelationship[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        router.push("/auth/login");
        return;
      }

      // Fetch all sessions for the user
      const { data: sessionsData } = await supabase
        .from("sessions")
        .select("*")
        .order("updated_at", { ascending: false });

      const rows = (sessionsData as SessionRow[] | null) || [];
      setSessions(rows);

      if (rows.length > 0) {
        const sessionIds = rows.map((s) => s.id);

        const [conceptsRes, gapsRes, relsRes] = await Promise.all([
          supabase.from("concepts").select("*").in("session_id", sessionIds),
          supabase.from("gaps").select("*").in("session_id", sessionIds),
          supabase
            .from("concept_relationships")
            .select("*")
            .in("session_id", sessionIds),
        ]);

        if (Array.isArray(conceptsRes.data)) {
          const deduped = deduplicateConcepts(conceptsRes.data);
          setConcepts(deduped);

          const sessionById = new Map(rows.map((s) => [s.id, s]));
          const groups = new Map<string, Concept[]>();
          for (const concept of conceptsRes.data) {
            const session = sessionById.get(concept.session_id);
            const topic = session?.topic?.trim() || "Untitled";
            if (!groups.has(topic)) groups.set(topic, []);
            groups.get(topic)?.push(concept);
          }

          const groupList = Array.from(groups.entries()).map(([topic, list]) => {
            const topicKey = normalizeConceptName(topic);
            const allUnique = deduplicateConcepts(list);
            const subtopics = allUnique.filter(
              (c) => normalizeConceptName(c.name) !== topicKey
            );
            const mastery =
              allUnique.length > 0
                ? Math.max(...allUnique.map((c) => c.mastery_score))
                : 0;
            return { topic, mastery_score: mastery, concepts: subtopics };
          });

          setGardenGroups(groupList);
        }
        if (Array.isArray(gapsRes.data))
          setGaps(deduplicateGaps(gapsRes.data));
        if (Array.isArray(relsRes.data))
          setRelationships(deduplicateRelationships(relsRes.data));
      }

      setLoading(false);
    }

    load();
  }, [supabase, router]);

  // Derive a primary subject area from the most common one across sessions
  const subjectArea = (() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      if (s.subject_area) {
        counts.set(s.subject_area, (counts.get(s.subject_area) || 0) + 1);
      }
    }
    let best: string | null = null;
    let bestCount = 0;
    for (const [area, count] of counts) {
      if (count > bestCount) {
        best = area;
        bestCount = count;
      }
    }
    return best;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">
          Loading dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href="/app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={22}
              height={22}
              className="rounded-md"
            />
            <h1 className="font-outfit font-semibold text-foreground">
              Dashboard
            </h1>
          </div>
          <div className="h-5 w-px bg-border" />
          <span className="text-sm text-muted-foreground">
            {sessions.length} {sessions.length === 1 ? "session" : "sessions"} &middot; {concepts.length} {concepts.length === 1 ? "concept" : "concepts"}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="garden">
          <TabsList className="inline-flex gap-1 bg-muted/50 rounded-xl mb-6 px-0 py-1">
            <TabsTrigger
              value="garden"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Sprout className="h-4 w-4" />
              Garden
            </TabsTrigger>
            <TabsTrigger
              value="mastery"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BarChart3 className="h-4 w-4" />
              Mastery
            </TabsTrigger>
            <TabsTrigger
              value="map"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <GitFork className="h-4 w-4" />
              Concept Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="garden">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <KnowledgeGarden
                  groups={gardenGroups}
                  subjectArea={subjectArea}
                />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="mastery">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <MasteryDashboard concepts={concepts} gaps={gaps} />
              </div>
            </section>
          </TabsContent>

          <TabsContent value="map">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                <ConceptGraph
                  concepts={concepts}
                  relationships={relationships}
                />
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
