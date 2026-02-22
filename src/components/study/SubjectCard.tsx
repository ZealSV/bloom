"use client";

import { motion } from "framer-motion";
import { Mic, BookOpen, ClipboardCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subject } from "@/types/study";

const colorMap: Record<string, string> = {
  red: "bg-red-500",
  orange: "bg-orange-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
  blue: "bg-blue-500",
  purple: "bg-purple-500",
  pink: "bg-pink-500",
  cyan: "bg-cyan-500",
};

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

export default function SubjectCard({
  subject,
  onClick,
  onDelete,
}: SubjectCardProps) {
  const colorClass = subject.color
    ? colorMap[subject.color] || "bg-primary"
    : "bg-primary";

  return (
    <motion.div
      className="group relative rounded-2xl border border-border bg-card hover:bg-muted/50 cursor-pointer transition-colors overflow-hidden"
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
    >
      {/* Color accent bar */}
      <div className={`h-1.5 w-full ${colorClass}`} />

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-outfit font-semibold text-foreground text-base">
            {subject.name}
          </h3>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Mic className="h-3 w-3" />
            {subject.lecture_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            {subject.deck_count ?? 0}
          </span>
          <span className="flex items-center gap-1">
            <ClipboardCheck className="h-3 w-3" />
            {subject.exam_count ?? 0}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
