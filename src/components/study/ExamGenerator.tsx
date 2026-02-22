"use client";

import { useState } from "react";
import { ClipboardCheck, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SourceSelector from "./SourceSelector";
import type { SourceType } from "@/types/study";

interface ExamGeneratorProps {
  onGenerated: (examId: string) => void;
  subjectId?: string;
}

export default function ExamGenerator({ onGenerated, subjectId }: ExamGeneratorProps) {
  const [selected, setSelected] = useState<{
    sourceType: SourceType;
    sourceIds: string[];
  }>({ sourceType: "all", sourceIds: [] });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/study/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: selected.sourceType,
          sourceIds: selected.sourceIds,
          ...(subjectId ? { subjectId } : {}),
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to generate exam");
      }

      const { exam } = await res.json();
      onGenerated(exam.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          Generate Practice Exam
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        AI will create a mixed-format exam (multiple choice, true/false, short
        answer) from your learning materials.
      </p>

      <SourceSelector onSelect={(st, ids) => setSelected({ sourceType: st, sourceIds: ids })} selected={selected} subjectId={subjectId} />

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      <Button
        onClick={handleGenerate}
        disabled={generating}
        className="w-full"
      >
        {generating ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating exam...
          </>
        ) : (
          <>
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Generate Exam
          </>
        )}
      </Button>
    </div>
  );
}
