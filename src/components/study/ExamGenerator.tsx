"use client";

import { useState } from "react";
import { ClipboardCheck, Flower, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SourceSelector from "./SourceSelector";
import { useGeneration } from "@/contexts/GenerationContext";
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

  const { generateExam, isGenerating } = useGeneration();
  const generating = isGenerating("exams", subjectId);

  const handleGenerate = () => {
    generateExam(
      {
        sourceType: selected.sourceType,
        sourceIds: selected.sourceIds,
        subjectId,
      },
      onGenerated
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-1">
        <Flower className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-medium text-foreground">
          Generate Practice Exam
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        AI will create a mixed-format exam (multiple choice, true/false, short
        answer) from your learning materials.
      </p>

      <SourceSelector onSelect={(st, ids) => setSelected({ sourceType: st, sourceIds: ids })} selected={selected} subjectId={subjectId} />

      <Button
        onClick={handleGenerate}
        disabled={generating || selected.sourceType === "none"}
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
