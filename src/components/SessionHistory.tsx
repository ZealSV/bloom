"use client";

import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Sprout, LayoutDashboard, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Session } from "@/hooks/useSession";

interface SessionHistoryProps {
  sessions: Session[];
  currentSessionId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onNew: () => void;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const subjectColors: Record<string, string> = {
  Biology: "bg-emerald-500/20 text-emerald-500 dark:text-emerald-400",
  "Computer Science": "bg-blue-500/20 text-blue-500 dark:text-blue-400",
  Math: "bg-purple-500/20 text-purple-500 dark:text-purple-400",
  Physics: "bg-amber-500/20 text-amber-500 dark:text-amber-400",
  History: "bg-orange-500/20 text-orange-500 dark:text-orange-400",
  Chemistry: "bg-cyan-500/20 text-cyan-500 dark:text-cyan-400",
  Literature: "bg-pink-500/20 text-pink-500 dark:text-pink-400",
};

export default function SessionHistory({
  sessions,
  currentSessionId,
  onSelect,
  onDelete,
  onNew,
}: SessionHistoryProps) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-3 space-y-2">
        <Link
          href="/app/dashboard"
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link
          href="/app/buckets"
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <FolderOpen className="h-4 w-4" />
          Buckets
        </Link>
        <Button
          onClick={onNew}
          variant="outline"
          className="w-full justify-center gap-2 text-sm border-primary/20 text-primary hover:bg-primary/10"
        >
          <Plus className="h-4 w-4" />
          New Session
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <AnimatePresence mode="popLayout">
          {sessions.map((session) => (
            <motion.div
              key={session.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={`group mb-1 rounded-lg cursor-pointer transition-colors ${
                currentSessionId === session.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted border border-transparent"
              }`}
              onClick={() => onSelect(session.id)}
            >
              <div className="p-2.5">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate flex-1">
                    {session.topic}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(session.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all text-muted-foreground hover:text-destructive shrink-0"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {session.subject_area && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        subjectColors[session.subject_area] ||
                        "bg-muted text-muted-foreground"
                      }`}
                    >
                      {session.subject_area}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {timeAgo(session.created_at)}
                  </span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {sessions.length === 0 && (
          <div className="text-center py-8 px-4">
            <Sprout className="h-6 w-6 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              No sessions yet. Start teaching!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
