"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  BookOpen,
  ClipboardCheck,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase-browser";
import LectureRecorder from "@/components/study/LectureRecorder";
import LectureCard from "@/components/study/LectureCard";
import LectureView from "@/components/study/LectureView";
import FlashcardGenerator from "@/components/study/FlashcardGenerator";
import FlashcardDeck from "@/components/study/FlashcardDeck";
import ExamGenerator from "@/components/study/ExamGenerator";
import ExamView from "@/components/study/ExamView";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useExam } from "@/hooks/useExam";
import type { Lecture, FlashcardDeck as DeckType, PracticeExam } from "@/types/study";

type LectureViewState =
  | { mode: "list" }
  | { mode: "record" }
  | { mode: "view"; lecture: Lecture };

type FlashcardViewState =
  | { mode: "list" }
  | { mode: "generate" }
  | { mode: "study"; deckId: string };

type ExamViewState =
  | { mode: "list" }
  | { mode: "generate" }
  | { mode: "take"; examId: string };

export default function BucketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [lectureView, setLectureView] = useState<LectureViewState>({
    mode: "list",
  });
  const [flashcardView, setFlashcardView] = useState<FlashcardViewState>({
    mode: "list",
  });
  const [examView, setExamView] = useState<ExamViewState>({ mode: "list" });

  const {
    decks,
    currentDeck,
    cards,
    fetchDecks,
    fetchDeck,
    deleteDeck,
    reviewCard,
  } = useFlashcards();

  const {
    exams,
    currentExam,
    fetchExams,
    fetchExam,
    submitExam,
  } = useExam();

  const supabase = createClient();

  const fetchLectures = useCallback(async () => {
    const res = await fetch("/api/lectures");
    if (res.ok) {
      const data = await res.json();
      setLectures(data);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }

      await Promise.all([fetchLectures(), fetchDecks(), fetchExams()]);
      setLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLectureCreated = async (lectureId: string) => {
    await fetchLectures();
    const lecture = lectures.find((l) => l.id === lectureId);
    if (lecture) {
      setLectureView({ mode: "view", lecture });
    } else {
      setLectureView({ mode: "list" });
    }
  };

  const handleGenerateFlashcards = (lectureId: string) => {
    // Switch to flashcards tab with the lecture pre-selected
    setFlashcardView({ mode: "generate" });
  };

  const handleGenerateExam = (lectureId: string) => {
    setExamView({ mode: "generate" });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href="/app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={22}
              height={22}
              className="rounded-md"
            />
            <h1 className="font-outfit font-semibold text-foreground">
              Study Tools
            </h1>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        <Tabs defaultValue="lectures">
          <TabsList className="inline-flex gap-1 bg-muted/50 rounded-xl mb-6 px-0 py-1">
            <TabsTrigger
              value="lectures"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Mic className="h-4 w-4" />
              Lectures
            </TabsTrigger>
            <TabsTrigger
              value="flashcards"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <BookOpen className="h-4 w-4" />
              Flashcards
            </TabsTrigger>
            <TabsTrigger
              value="exams"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <ClipboardCheck className="h-4 w-4" />
              Exams
            </TabsTrigger>
          </TabsList>

          {/* Lectures Tab */}
          <TabsContent value="lectures">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                {lectureView.mode === "record" ? (
                  <LectureRecorder
                    onComplete={handleLectureCreated}
                    onCancel={() => setLectureView({ mode: "list" })}
                  />
                ) : lectureView.mode === "view" ? (
                  <LectureView
                    lecture={lectureView.lecture}
                    onBack={() => {
                      fetchLectures();
                      setLectureView({ mode: "list" });
                    }}
                    onGenerateFlashcards={handleGenerateFlashcards}
                    onGenerateExam={handleGenerateExam}
                    onRefresh={async () => {
                      await fetchLectures();
                      const updated = lectures.find(
                        (l) => l.id === lectureView.lecture.id
                      );
                      if (updated)
                        setLectureView({ mode: "view", lecture: updated });
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Your Lectures
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setLectureView({ mode: "record" })}
                      >
                        <Mic className="mr-1.5 h-3.5 w-3.5" />
                        Record Lecture
                      </Button>
                    </div>

                    {lectures.length === 0 ? (
                      <div className="text-center py-12">
                        <Mic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No lectures yet. Record your first lecture to get
                          started.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {lectures.map((lecture) => (
                          <LectureCard
                            key={lecture.id}
                            lecture={lecture}
                            onClick={() =>
                              setLectureView({ mode: "view", lecture })
                            }
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* Flashcards Tab */}
          <TabsContent value="flashcards">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                {flashcardView.mode === "generate" ? (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFlashcardView({ mode: "list" })}
                      className="mb-3 h-8 px-2"
                    >
                      <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                      Back
                    </Button>
                    <FlashcardGenerator
                      onGenerated={(deckId) => {
                        fetchDecks();
                        fetchDeck(deckId);
                        setFlashcardView({ mode: "study", deckId });
                      }}
                    />
                  </div>
                ) : flashcardView.mode === "study" && currentDeck ? (
                  <FlashcardDeck
                    deck={currentDeck}
                    cards={cards}
                    onReview={reviewCard}
                    onBack={() => {
                      fetchDecks();
                      setFlashcardView({ mode: "list" });
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Flashcard Decks
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setFlashcardView({ mode: "generate" })}
                      >
                        <BookOpen className="mr-1.5 h-3.5 w-3.5" />
                        Generate Deck
                      </Button>
                    </div>

                    {decks.length === 0 ? (
                      <div className="text-center py-12">
                        <BookOpen className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No flashcard decks yet. Generate your first deck from
                          your learning materials.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {decks.map((d: DeckType) => (
                          <motion.div
                            key={d.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              fetchDeck(d.id);
                              setFlashcardView({
                                mode: "study",
                                deckId: d.id,
                              });
                            }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {d.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {d.card_count} cards &middot;{" "}
                                {new Date(d.created_at).toLocaleDateString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteDeck(d.id);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>

          {/* Exams Tab */}
          <TabsContent value="exams">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5">
                {examView.mode === "generate" ? (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExamView({ mode: "list" })}
                      className="mb-3 h-8 px-2"
                    >
                      <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                      Back
                    </Button>
                    <ExamGenerator
                      onGenerated={(examId) => {
                        fetchExams();
                        fetchExam(examId);
                        setExamView({ mode: "take", examId });
                      }}
                    />
                  </div>
                ) : examView.mode === "take" && currentExam ? (
                  <ExamView
                    exam={currentExam}
                    onSubmit={submitExam}
                    onBack={() => {
                      fetchExams();
                      setExamView({ mode: "list" });
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Practice Exams
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setExamView({ mode: "generate" })}
                      >
                        <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />
                        Generate Exam
                      </Button>
                    </div>

                    {exams.length === 0 ? (
                      <div className="text-center py-12">
                        <ClipboardCheck className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No practice exams yet. Generate your first exam from
                          your learning materials.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {exams.map((ex: PracticeExam) => (
                          <motion.div
                            key={ex.id}
                            className="flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                            onClick={() => {
                              fetchExam(ex.id);
                              setExamView({
                                mode: "take",
                                examId: ex.id,
                              });
                            }}
                            whileHover={{ scale: 1.01 }}
                          >
                            <div>
                              <p className="text-sm font-medium text-foreground">
                                {ex.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {(ex.questions as unknown[]).length} questions
                                &middot;{" "}
                                {new Date(ex.created_at).toLocaleDateString()}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
