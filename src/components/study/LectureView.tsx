"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  ScrollText,
  Sparkles,
  Loader2,
  BookOpen,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import type { Lecture } from "@/types/study";

interface LectureViewProps {
  lecture: Lecture;
  onBack: () => void;
  onGenerateFlashcards?: (lectureId: string) => void;
  onGenerateExam?: (lectureId: string) => void;
  onRefresh?: () => void;
}

export default function LectureView({
  lecture,
  onBack,
  onGenerateFlashcards,
  onGenerateExam,
  onRefresh,
}: LectureViewProps) {
  const [summarizing, setSummarizing] = useState(false);

  const handleSummarize = async () => {
    setSummarizing(true);
    try {
      const res = await fetch(`/api/lectures/${lecture.id}/summarize`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Failed to summarize");
      onRefresh?.();
    } catch {
      // Error handling is silent — user can retry
    } finally {
      setSummarizing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 10 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="h-8 w-8 p-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-outfit text-lg font-semibold text-foreground">
              {lecture.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {new Date(lecture.created_at).toLocaleDateString()} &middot;{" "}
              {Math.floor(lecture.duration_seconds / 60)}m{" "}
              {lecture.duration_seconds % 60}s
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {onGenerateFlashcards && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateFlashcards(lecture.id)}
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Flashcards
            </Button>
          )}
          {onGenerateExam && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onGenerateExam(lecture.id)}
            >
              <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
              Exam
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <Tabs defaultValue={lecture.summary ? "notes" : "transcript"}>
        <TabsList className="inline-flex gap-1 bg-muted/50 p-1 rounded-xl">
          {lecture.summary && (
            <TabsTrigger
              value="notes"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="h-3.5 w-3.5" />
              Notes
            </TabsTrigger>
          )}
          <TabsTrigger
            value="transcript"
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm data-[state=active]:bg-background data-[state=active]:shadow-sm"
          >
            <ScrollText className="h-3.5 w-3.5" />
            Transcript
          </TabsTrigger>
        </TabsList>

        {lecture.summary && (
          <TabsContent value="notes">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5 space-y-5">
                {/* Key Points */}
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                    Key Points
                  </h4>
                  <ul className="space-y-1.5">
                    {lecture.summary.keyPoints.map((point, i) => (
                      <li
                        key={i}
                        className="flex items-start gap-2 text-sm text-foreground"
                      >
                        <span className="text-primary mt-1">&#8226;</span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Sections */}
                {lecture.summary.sections.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Sections
                    </h4>
                    <div className="space-y-3">
                      {lecture.summary.sections.map((section, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-muted/20 border border-border/50 p-3"
                        >
                          <p className="text-sm font-medium text-foreground mb-1">
                            {section.heading}
                          </p>
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {section.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Key Terms */}
                {lecture.summary.keyTerms.length > 0 && (
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                      Key Terms
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {lecture.summary.keyTerms.map((term, i) => (
                        <div
                          key={i}
                          className="rounded-lg bg-muted/20 border border-border/50 p-2.5"
                        >
                          <p className="text-xs font-semibold text-primary">
                            {term.term}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {term.definition}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        )}

        <TabsContent value="transcript">
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="p-5">
              {!lecture.summary && lecture.status === "ready" && (
                <div className="mb-4 flex items-center justify-between rounded-lg bg-primary/5 border border-primary/20 p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm text-foreground">
                      Generate AI-powered structured notes
                    </span>
                  </div>
                  <Button
                    size="sm"
                    onClick={handleSummarize}
                    disabled={summarizing}
                  >
                    {summarizing ? (
                      <>
                        <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      "Summarize"
                    )}
                  </Button>
                </div>
              )}
              {lecture.transcript ? (
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {lecture.transcript}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground italic text-center py-8">
                  No transcript available
                </p>
              )}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
