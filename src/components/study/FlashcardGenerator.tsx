"use client";

import { useState } from "react";
import { BookOpen, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import SourceSelector from "./SourceSelector";
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
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/study/flashcards", {
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
        throw new Error(data.error || "Failed to generate flashcards");
      }

      const { deck } = await res.json();
      onGenerated(deck.id);
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
          Generate Flashcards
        </h3>
      </div>

      <p className="text-xs text-muted-foreground">
        AI will create flashcards from your learning materials. Choose specific
        sources or use all available data.
      </p>

      <SourceSelector onSelect={(st, ids) => setSelected({ sourceType: st, sourceIds: ids })} selected={selected} subjectId={subjectId} />

      {error && (
        <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

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
