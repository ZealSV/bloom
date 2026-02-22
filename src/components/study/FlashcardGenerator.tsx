"use client";

import { useState } from "react";
import { BookOpen, Flower, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import SourceSelector from "./SourceSelector";
import { useGeneration } from "@/contexts/GenerationContext";
import type { SourceType } from "@/types/study";

interface FlashcardGeneratorProps {
  onGenerated: (deckId: string) => void;
  subjectId?: string;
}

export default function FlashcardGenerator({
  onGenerated,
  subjectId,
}: FlashcardGeneratorProps) {
  const [selected, setSelected] = useState<{
    sourceType: SourceType;
    sourceIds: string[];
  }>({ sourceType: "all", sourceIds: [] });

  const { generateFlashcards, isGenerating } = useGeneration();
  const generating = isGenerating("flashcards", subjectId);

  const handleGenerate = () => {
    generateFlashcards(
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
          Generate Flashcards
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        AI will create flashcards from your learning materials. Choose specific
        sources or use all available data.
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
            Generating flashcards...
          </>
        ) : (
          <>
            <BookOpen className="mr-2 h-4 w-4" />
            Generate Flashcards
          </>
        )}
      </Button>
    </div>
  );
}
