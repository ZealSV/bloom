"use client";

import { motion } from "framer-motion";
import { Mic, BookOpen, ClipboardCheck, FileText, Trash2, ChevronRight, Pencil, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subject } from "@/types/study";

const colorMap: Record<string, { bg: string; accent: string; glow: string; icon: string; border: string }> = {
  red: {
    bg: "bg-red-500/10",
    accent: "bg-red-500",
    glow: "bg-red-500/20",
    icon: "text-red-500 bg-red-500/10",
    border: "border-red-500/20 hover:border-red-500/40",
  },
  orange: {
    bg: "bg-orange-500/10",
    accent: "bg-orange-500",
    glow: "bg-orange-500/20",
    icon: "text-orange-500 bg-orange-500/10",
    border: "border-orange-500/20 hover:border-orange-500/40",
  },
  yellow: {
    bg: "bg-yellow-500/10",
    accent: "bg-yellow-500",
    glow: "bg-yellow-500/20",
    icon: "text-yellow-500 bg-yellow-500/10",
    border: "border-yellow-500/20 hover:border-yellow-500/40",
  },
  green: {
    bg: "bg-emerald-500/10",
    accent: "bg-emerald-500",
    glow: "bg-emerald-500/20",
    icon: "text-emerald-500 bg-emerald-500/10",
    border: "border-emerald-500/20 hover:border-emerald-500/40",
  },
  blue: {
    bg: "bg-blue-500/10",
    accent: "bg-blue-500",
    glow: "bg-blue-500/20",
    icon: "text-blue-500 bg-blue-500/10",
    border: "border-blue-500/20 hover:border-blue-500/40",
  },
  purple: {
    bg: "bg-purple-500/10",
    accent: "bg-purple-500",
    glow: "bg-purple-500/20",
    icon: "text-purple-500 bg-purple-500/10",
    border: "border-purple-500/20 hover:border-purple-500/40",
  },
  pink: {
    bg: "bg-pink-500/10",
    accent: "bg-pink-500",
    glow: "bg-pink-500/20",
    icon: "text-pink-500 bg-pink-500/10",
    border: "border-pink-500/20 hover:border-pink-500/40",
  },
  cyan: {
    bg: "bg-cyan-500/10",
    accent: "bg-cyan-500",
    glow: "bg-cyan-500/20",
    icon: "text-cyan-500 bg-cyan-500/10",
    border: "border-cyan-500/20 hover:border-cyan-500/40",
  },
};

const defaultColor = colorMap.blue;

interface SubjectCardProps {
  subject: Subject;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
  dragHandle?: React.ReactNode;
}

export default function SubjectCard({
  subject,
  onClick,
  onDelete,
  onEdit,
  dragHandle,
}: SubjectCardProps) {
  const colors = subject.color ? colorMap[subject.color] || defaultColor : defaultColor;
  const lectureCount = subject.lecture_count ?? 0;
  const deckCount = subject.deck_count ?? 0;
  const examCount = subject.exam_count ?? 0;
  const documentCount = subject.document_count ?? 0;
  const totalItems = lectureCount + deckCount + examCount + documentCount;

  return (
    <motion.div
      className={`group relative rounded-2xl border ${colors.bg} ${colors.border} cursor-pointer transition-colors duration-200 shadow-none h-full min-h-[190px]`}
      onClick={onClick}
    >
      {/* Solid background only (no glow) */}

      <div className="relative p-5 h-full flex flex-col">
        {/* Top row: drag handle + color dot + actions */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            {dragHandle}
            <div className={`w-3 h-3 rounded-full ${colors.accent} ring-2 ring-offset-1 ring-offset-transparent ring-white/10`} />
          </div>
          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity -mr-1 -mt-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(e);
                }}
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(e);
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Subject name */}
        <h3 className="font-outfit font-semibold text-foreground text-lg mb-1 tracking-tight">
          {subject.name}
        </h3>
        <p className="text-xs text-muted-foreground mb-5">
          {totalItems === 0
            ? "No materials yet"
            : `${totalItems} ${totalItems === 1 ? "item" : "items"} total`}
        </p>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-auto">
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.icon}`}>
            <Mic className="h-3 w-3" />
            <span className="font-medium">{lectureCount}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.icon}`}>
            <BookOpen className="h-3 w-3" />
            <span className="font-medium">{deckCount}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.icon}`}>
            <ClipboardCheck className="h-3 w-3" />
            <span className="font-medium">{examCount}</span>
          </div>
          <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg ${colors.icon}`}>
            <FileText className="h-3 w-3" />
            <span className="font-medium">{documentCount}</span>
          </div>
          <div className="flex-1" />
          <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-muted-foreground group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.div>
  );
}
