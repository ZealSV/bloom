"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mic,
  BookOpen,
  ClipboardCheck,
  Trash2,
  Pencil,
  FileUp,
  UploadCloud,
  FileText,
  CheckCircle2,
  X,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import LectureRecorder from "@/components/study/LectureRecorder";
import LectureCard from "@/components/study/LectureCard";
import LectureView from "@/components/study/LectureView";
import FlashcardGenerator from "@/components/study/FlashcardGenerator";
import FlashcardDeck from "@/components/study/FlashcardDeck";
import ExamGenerator from "@/components/study/ExamGenerator";
import ExamView from "@/components/study/ExamView";
import { useFlashcards } from "@/hooks/useFlashcards";
import { useExam } from "@/hooks/useExam";
import type {
  Lecture,
  FlashcardDeck as DeckType,
  PracticeExam,
  Subject,
} from "@/types/study";

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

async function readApiResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  if (text.includes("<!DOCTYPE html>")) {
    return { error: "Server returned an HTML error page" };
  }

  return {
    error: text.slice(0, 300) || "Server returned a non-JSON response.",
  };
}

export default function SubjectDetailPage({
  params,
}: {
  params: Promise<{ subjectId: string }>;
}) {
  const { subjectId } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<Subject | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [lectureView, setLectureView] = useState<LectureViewState>({
    mode: "list",
  });
  const [flashcardView, setFlashcardView] = useState<FlashcardViewState>({
    mode: "list",
  });
  const [examView, setExamView] = useState<ExamViewState>({ mode: "list" });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Edit dialog state
  const [editDialog, setEditDialog] = useState<{
    open: boolean;
    type: "lecture" | "deck" | "exam";
    id: string;
    title: string;
  }>({ open: false, type: "lecture", id: "", title: "" });

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

  const fetchLectures = useCallback(async () => {
    const res = await fetch(`/api/lectures?subject_id=${subjectId}`);
    if (res.ok) {
      const data = await res.json();
      setLectures(data);
    }
  }, [subjectId]);

  const fetchLecture = useCallback(async (lectureId: string) => {
    const res = await fetch(`/api/lectures/${lectureId}`);
    if (res.ok) {
      const data = await res.json();
      return data as Lecture;
    }
    return null;
  }, []);

  const deleteLecture = useCallback(async (lectureId: string) => {
    const res = await fetch(`/api/lectures/${lectureId}`, { method: "DELETE" });
    if (res.ok) {
      setLectures((prev) => prev.filter((l) => l.id !== lectureId));
    }
  }, []);

  const deleteExam = useCallback(async (examId: string) => {
    const res = await fetch(`/api/study/exams/${examId}`, { method: "DELETE" });
    if (res.ok) {
      fetchExams(subjectId);
    }
  }, [fetchExams, subjectId]);

  const clearSelectedFile = useCallback(() => {
    if (isUploadingFile) return;
    setUploadFile(null);
    setUploadSuccess(false);
    setUploadError(null);
    if (uploadInputRef.current) {
      uploadInputRef.current.value = "";
    }
  }, [isUploadingFile]);

  const handleFileSelect = useCallback((candidate: File | null) => {
    if (!candidate) return;

    const isPdf =
      candidate.type === "application/pdf" ||
      candidate.name.toLowerCase().endsWith(".pdf");

    if (!isPdf) {
      setUploadError("Please upload a PDF file.");
      setUploadFile(null);
      if (uploadInputRef.current) {
        uploadInputRef.current.value = "";
      }
      return;
    }

    setUploadError(null);
    setUploadSuccess(false);
    setUploadFile(candidate);
  }, []);

  const handleFileDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      handleFileSelect(e.dataTransfer.files?.[0] ?? null);
    },
    [handleFileSelect]
  );

  const handleInlineUpload = useCallback(async () => {
    if (!uploadFile) return;

    setUploadError(null);
    setIsUploadingFile(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", uploadFile.name);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await readApiResponse(uploadResponse);
      if (!uploadResponse.ok) {
        throw new Error(
          (uploadResult as { error?: string })?.error ||
            `Upload failed (${uploadResponse.status})`
        );
      }

      const documentId = (uploadResult as { documentId?: string })?.documentId;
      if (typeof documentId !== "string" || !documentId) {
        throw new Error("Upload succeeded but no documentId was returned.");
      }

      const ingestResponse = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      const ingestResult = await readApiResponse(ingestResponse);
      if (!ingestResponse.ok) {
        throw new Error(
          (ingestResult as { error?: string })?.error ||
            `Ingest failed (${ingestResponse.status})`
        );
      }

      setUploadSuccess(true);
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Failed to upload file."
      );
    } finally {
      setIsUploadingFile(false);
    }
  }, [uploadFile]);

  const handleEditSave = useCallback(async () => {
    const { type, id, title } = editDialog;
    if (!title.trim()) return;

    let url = "";
    if (type === "lecture") url = `/api/lectures/${id}`;
    else if (type === "deck") url = `/api/study/flashcards/${id}`;
    else if (type === "exam") url = `/api/study/exams/${id}`;

    const res = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: title.trim() }),
    });

    if (res.ok) {
      if (type === "lecture") {
        setLectures((prev) =>
          prev.map((l) => (l.id === id ? { ...l, title: title.trim() } : l))
        );
      } else if (type === "deck") {
        fetchDecks(subjectId);
      } else if (type === "exam") {
        fetchExams(subjectId);
      }
    }

    setEditDialog((prev) => ({ ...prev, open: false }));
  }, [editDialog, fetchDecks, fetchExams, subjectId]);

  useEffect(() => {
    async function init() {
      const subjectRes = await fetch(`/api/subjects/${subjectId}`);
      if (!subjectRes.ok) {
        router.push("/app/buckets");
        return;
      }
      const subjectData = await subjectRes.json();
      setSubject(subjectData);

      await Promise.all([
        fetchLectures(),
        fetchDecks(subjectId),
        fetchExams(subjectId),
      ]);
      setLoading(false);
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectId]);

  const handleLectureCreated = async (lectureId: string) => {
    await fetchLectures();
    const lecture = await fetchLecture(lectureId);
    if (lecture) {
      setLectureView({ mode: "view", lecture });
    } else {
      setLectureView({ mode: "list" });
    }
  };

  const handleViewLecture = async (lecture: Lecture) => {
    const full = await fetchLecture(lecture.id);
    if (full) {
      setLectureView({ mode: "view", lecture: full });
    }
  };

  if (loading || !subject) {
    return (
      <div className="min-h-screen bg-background">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-8 rounded-md" />
            <div className="h-5 w-px bg-border" />
            <Skeleton className="h-5 w-32" />
          </div>
        </header>
        <div className="max-w-5xl mx-auto px-6 py-8">
          <Skeleton className="h-9 w-72 mb-6 rounded-xl" />
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32 rounded-md" />
            </div>
            <div className="grid gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href="/app/buckets">
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
              {subject.name}
            </h1>
          </div>
        </div>
      </header>

      {/* Edit Title Dialog */}
      <Dialog
        open={editDialog.open}
        onOpenChange={(open) => setEditDialog((prev) => ({ ...prev, open }))}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Rename</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={editDialog.title}
              onChange={(e) =>
                setEditDialog((prev) => ({ ...prev, title: e.target.value }))
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSave();
              }}
              autoFocus
            />
            <Button
              onClick={handleEditSave}
              disabled={!editDialog.title.trim()}
              className="w-full"
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
            <TabsTrigger
              value="files"
              className="flex items-center gap-2 rounded-lg px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileUp className="h-4 w-4" />
              Files
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
                    subjectId={subjectId}
                  />
                ) : lectureView.mode === "view" ? (
                  <LectureView
                    lecture={lectureView.lecture}
                    onBack={() => {
                      fetchLectures();
                      setLectureView({ mode: "list" });
                    }}
                    onGenerateFlashcards={() => {
                      setFlashcardView({ mode: "generate" });
                    }}
                    onGenerateExam={() => {
                      setExamView({ mode: "generate" });
                    }}
                    onRefresh={async () => {
                      await fetchLectures();
                      const updated = await fetchLecture(lectureView.lecture.id);
                      if (updated)
                        setLectureView({ mode: "view", lecture: updated });
                    }}
                  />
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-foreground">
                        Lectures
                      </h3>
                      <Button
                        size="sm"
                        onClick={() => setLectureView({ mode: "record" })}
                      >
                        <Mic className="mr-1.5 h-3.5 w-3.5" />
                        Add Lecture
                      </Button>
                    </div>

                    {lectures.length === 0 ? (
                      <div className="text-center py-12">
                        <Mic className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No lectures yet. Record or upload your first lecture to
                          get started.
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {lectures.map((lecture) => (
                          <LectureCard
                            key={lecture.id}
                            lecture={lecture}
                            onClick={() => handleViewLecture(lecture)}
                            onDelete={() => deleteLecture(lecture.id)}
                            onEdit={() =>
                              setEditDialog({
                                open: true,
                                type: "lecture",
                                id: lecture.id,
                                title: lecture.title,
                              })
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
                      subjectId={subjectId}
                      onGenerated={(deckId) => {
                        fetchDecks(subjectId);
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
                      fetchDecks(subjectId);
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
                            className="group flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
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
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditDialog({
                                    open: true,
                                    type: "deck",
                                    id: d.id,
                                    title: d.title,
                                  });
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
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
                      subjectId={subjectId}
                      onGenerated={(examId) => {
                        fetchExams(subjectId);
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
                      fetchExams(subjectId);
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
                            className="group flex items-center justify-between p-3 rounded-xl border border-border hover:bg-muted/50 cursor-pointer transition-colors"
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
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditDialog({
                                    open: true,
                                    type: "exam",
                                    id: ex.id,
                                    title: ex.title,
                                  });
                                }}
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  deleteExam(ex.id);
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
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

          {/* Files Tab */}
          <TabsContent value="files">
            <section className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-foreground">
                    Upload File
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Add a PDF to your materials.
                  </p>
                </div>

                {!uploadFile && (
                  <div
                    className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
                    onClick={() => uploadInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={handleFileDrop}
                  >
                    <UploadCloud className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">
                      Drop your PDF here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground">
                      PDF only
                    </p>
                  </div>
                )}

                <input
                  ref={uploadInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />

                {uploadFile && (
                  <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="text-sm text-foreground truncate">
                        {uploadFile.name}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                      onClick={clearSelectedFile}
                      disabled={isUploadingFile}
                      title="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}

                {uploadSuccess && (
                  <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                    <p className="text-sm text-foreground">Uploaded and indexed.</p>
                  </div>
                )}

                {uploadError && (
                  <p className="text-sm text-destructive">{uploadError}</p>
                )}

                <div className="flex items-center justify-end">
                  <Button
                    type="button"
                    onClick={handleInlineUpload}
                    disabled={!uploadFile || isUploadingFile || uploadSuccess}
                  >
                    {uploadSuccess
                      ? "Done"
                      : isUploadingFile
                        ? "Uploading..."
                        : "Upload PDF"}
                  </Button>
                </div>
              </div>
            </section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
