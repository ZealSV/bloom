"use client";

import { Clock, FileText, Loader2, AlertCircle, Trash2, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Lecture } from "@/types/study";

interface LectureCardProps {
  lecture: Lecture;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  onEdit?: (e: React.MouseEvent) => void;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m < 60) return `${m}m ${s}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString();
}

const statusConfig: Record<
  string,
  { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon?: React.ReactNode }
> = {
  recording: { label: "Recording", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  processing: { label: "Processing", variant: "secondary", icon: <Loader2 className="h-3 w-3 animate-spin" /> },
  ready: { label: "Ready", variant: "default" },
  failed: { label: "Failed", variant: "destructive", icon: <AlertCircle className="h-3 w-3" /> },
};

export default function LectureCard({ lecture, onClick, onDelete, onEdit }: LectureCardProps) {
  const status = statusConfig[lecture.status] || statusConfig.ready;

  return (
    <div
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl border border-border bg-card hover:bg-muted/30 hover:border-primary/20 transition-all group cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
            {lecture.title}
          </p>
          <div className="flex items-center gap-3 mt-1.5">
            {lecture.duration_seconds > 0 && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatDuration(lecture.duration_seconds)}
              </span>
            )}
            {lecture.summary && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                Notes
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {formatDate(lecture.created_at)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Badge variant={status.variant} className="text-[10px] flex items-center gap-1">
            {status.icon}
            {status.label}
          </Badge>
          {onEdit && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(e);
              }}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
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
          )}
        </div>
      </div>
    </div>
  );
}
