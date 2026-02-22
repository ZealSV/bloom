"use client";

import { useState, useEffect } from "react";
import { FileText, Mic, MessageSquare, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase-browser";
import type { SourceType } from "@/types/study";

interface Source {
  id: string;
  title: string;
  type: SourceType;
}

interface SourceSelectorProps {
  onSelect: (sourceType: SourceType, sourceIds: string[]) => void;
  selected: { sourceType: SourceType; sourceIds: string[] };
  subjectId?: string;
}

export default function SourceSelector({
  onSelect,
  selected,
  subjectId,
}: SourceSelectorProps) {
  const [sources, setSources] = useState<Source[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewFilter, setViewFilter] = useState<"all" | "document" | "lecture">(
    "all"
  );
  const supabase = createClient();

  useEffect(() => {
    async function loadSources() {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      let lecturesQuery = supabase
        .from("lectures")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (subjectId) {
        lecturesQuery = lecturesQuery.eq("subject_id", subjectId);
      }

      const documentsQuery = subjectId
        ? supabase
            .from("documents" as any)
            .select("id, title, subject_id")
            .eq("subject_id", subjectId)
            .order("created_at", { ascending: false })
        : supabase
            .from("documents" as any)
            .select("id, title, subject_id")
            .order("created_at", { ascending: false });

      const sessionsQuery = supabase
        .from("sessions")
        .select("id, topic")
        .order("updated_at", { ascending: false })
        .limit(10);

      const [lecturesRes, documentsRes, sessionsRes] = await Promise.all([
        lecturesQuery,
        documentsQuery,
        sessionsQuery,
      ]);

      const all: Source[] = [];
      if (lecturesRes.data) {
        const lectures = lecturesRes.data as unknown as { id: string; title: string }[];
        all.push(
          ...lectures.map((l) => ({
            id: l.id,
            title: l.title,
            type: "lecture" as SourceType,
          }))
        );
      }
      if (documentsRes.data) {
        const documents = documentsRes.data as unknown as {
          id: string;
          title: string;
          subject_id?: string | null;
        }[];
        const scoped = subjectId
          ? documents.filter((d) => d.subject_id === subjectId)
          : documents;
        all.push(
          ...scoped.map((d) => ({
            id: d.id,
            title: d.title,
            type: "document" as SourceType,
          }))
        );
      }
      if (!subjectId && sessionsRes.data) {
        const sessions = sessionsRes.data as unknown as { id: string; topic: string }[];
        all.push(
          ...sessions.map((s) => ({
            id: s.id,
            title: s.topic,
            type: "session" as SourceType,
          }))
        );
      }

      setSources(all);
      setLoading(false);
    }

    loadSources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const isFilesFilter = viewFilter === "document";
  const isLecturesFilter = viewFilter === "lecture";
  const isAllSelected = selected.sourceType === "all";
  const isNoneSelected = selected.sourceType === "none";

  const toggleSource = (source: Source) => {
    if (selected.sourceType === "all" || selected.sourceType !== source.type) {
      onSelect(source.type, [source.id]);
      return;
    }

    const ids = selected.sourceIds.includes(source.id)
      ? selected.sourceIds.filter((id) => id !== source.id)
      : [...selected.sourceIds, source.id];

    if (ids.length === 0) {
      onSelect("none", []);
    } else {
      onSelect(source.type, ids);
    }
  };

  const selectAllSources = () => {
    setViewFilter("all");
    onSelect(isAllSelected ? "none" : "all", []);
  };

  const typeIcon = (type: SourceType) => {
    switch (type) {
      case "lecture":
        return <Mic className="h-3 w-3" />;
      case "document":
        return <FileText className="h-3 w-3" />;
      case "session":
        return <MessageSquare className="h-3 w-3" />;
      default:
        return null;
    }
  };

  const visibleSources = sources.filter((source) => {
    if (viewFilter === "all") return true;
    if (viewFilter === "lecture") {
      return source.type === "lecture" || source.type === "session";
    }
    return source.type === "document";
  });

  const emptyStateText =
    viewFilter === "document"
      ? "No uploaded files yet."
      : viewFilter === "lecture"
        ? "No lectures or chats yet."
        : "No sources available yet. Add lectures or chat sessions first.";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={isAllSelected ? "default" : "outline"}
          size="sm"
          onClick={selectAllSources}
          className="text-xs"
        >
          {isAllSelected ? (
            <CheckSquare className="mr-1.5 h-3 w-3" />
          ) : (
            <Square className="mr-1.5 h-3 w-3" />
          )}
          All Sources
        </Button>
        <Button
          variant={isFilesFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setViewFilter("document")}
          className="text-xs"
        >
          {isFilesFilter ? (
            <CheckSquare className="mr-1.5 h-3 w-3" />
          ) : (
            <Square className="mr-1.5 h-3 w-3" />
          )}
          Files
        </Button>
        <Button
          variant={isLecturesFilter ? "default" : "outline"}
          size="sm"
          onClick={() => setViewFilter("lecture")}
          className="text-xs"
        >
          {isLecturesFilter ? (
            <CheckSquare className="mr-1.5 h-3 w-3" />
          ) : (
            <Square className="mr-1.5 h-3 w-3" />
          )}
          Lectures
        </Button>
        {isAllSelected && (
          <span className="text-xs text-muted-foreground">
            All sources selected
          </span>
        )}
        {isNoneSelected && (
          <span className="text-xs text-muted-foreground">
            No sources selected
          </span>
        )}
        {!isAllSelected && selected.sourceIds.length > 0 && (
          <span className="text-xs text-muted-foreground">
            {selected.sourceIds.length} selected
          </span>
        )}
      </div>

      {!loading && sources.length > 0 && (
        <div className="max-h-48 overflow-y-auto space-y-1 rounded-lg border border-border p-2">
          {visibleSources.map((source) => {
            const isSelected =
              selected.sourceType === "all" ||
              (selected.sourceType === source.type &&
                selected.sourceIds.includes(source.id));
            return (
              <button
                key={source.id}
                onClick={() => toggleSource(source)}
                className={`w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-left text-xs transition-colors ${
                  isSelected
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                }`}
              >
                {isSelected ? (
                  <CheckSquare className="h-3 w-3 text-primary shrink-0" />
                ) : (
                  <Square className="h-3 w-3 text-muted-foreground/50 shrink-0" />
                )}
                <span className="text-muted-foreground shrink-0">
                  {typeIcon(source.type)}
                </span>
                <span className="truncate flex-1">{source.title}</span>
              </button>
            );
          })}
        </div>
      )}

      {!loading && sources.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {emptyStateText}
        </p>
      )}

      {!loading && sources.length > 0 && visibleSources.length === 0 && (
        <p className="text-xs text-muted-foreground">
          {emptyStateText}
        </p>
      )}
    </div>
  );
}
