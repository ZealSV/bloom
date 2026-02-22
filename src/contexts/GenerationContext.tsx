"use client";

import {
  createContext,
  useContext,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import type { SourceType } from "@/types/study";

// ---- Types ----------------------------------------------------------------

interface FlashcardParams {
  sourceType: SourceType;
  sourceIds: string[];
  subjectId?: string;
}

interface ExamParams {
  sourceType: SourceType;
  sourceIds: string[];
  subjectId?: string;
}

interface SlideParams {
  subjectId: string;
  title: string;
  slideCount: number;
  sourceType: SourceType;
  sourceIds: string[];
  template: string;
  generateImages: boolean;
}

type GenerationType = "flashcards" | "exams" | "slides";

interface GenerationContextValue {
  generateFlashcards: (
    params: FlashcardParams,
    onComplete?: (deckId: string) => void
  ) => void;
  generateExam: (
    params: ExamParams,
    onComplete?: (examId: string) => void
  ) => void;
  generateSlides: (
    params: SlideParams,
    onComplete?: (deckId: string, slideCount: number) => void
  ) => void;
  isGenerating: (type: GenerationType, subjectId?: string) => boolean;
  registerRefresh: (
    subjectId: string,
    callbacks: Partial<RefreshCallbacks>
  ) => () => void;
}

interface RefreshCallbacks {
  flashcards: () => void;
  exams: () => void;
  slides: () => void;
}

// ---- Context ---------------------------------------------------------------

const GenerationContext = createContext<GenerationContextValue | null>(null);

export function useGeneration() {
  const ctx = useContext(GenerationContext);
  if (!ctx)
    throw new Error("useGeneration must be used within GenerationProvider");
  return ctx;
}

// ---- Provider --------------------------------------------------------------

export function GenerationProvider({ children }: { children: ReactNode }) {
  // Track active generations: key = `${type}:${subjectId}`
  const activeRef = useRef<Set<string>>(new Set());
  // Registered refresh callbacks per subject
  const refreshRef = useRef<Map<string, Partial<RefreshCallbacks>>>(new Map());

  const markActive = (type: GenerationType, subjectId?: string) => {
    activeRef.current.add(`${type}:${subjectId ?? "all"}`);
  };

  const markDone = (type: GenerationType, subjectId?: string) => {
    activeRef.current.delete(`${type}:${subjectId ?? "all"}`);
  };

  const callRefresh = (type: GenerationType, subjectId?: string) => {
    if (subjectId) {
      refreshRef.current.get(subjectId)?.[type]?.();
    }
  };

  // ---- Flashcards ----------------------------------------------------------

  const generateFlashcards = useCallback(
    (params: FlashcardParams, onComplete?: (deckId: string) => void) => {
      const toastId = toast.loading("Generating flashcards...");
      markActive("flashcards", params.subjectId);

      fetch("/api/study/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: params.sourceType,
          sourceIds: params.sourceIds,
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to generate flashcards");
          }
          return res.json();
        })
        .then(({ deck }) => {
          toast.success(`Flashcards "${deck.title}" ready!`, { id: toastId });
          callRefresh("flashcards", params.subjectId);
          onComplete?.(deck.id);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Flashcard generation failed",
            { id: toastId }
          );
        })
        .finally(() => {
          markDone("flashcards", params.subjectId);
        });
    },
    []
  );

  // ---- Exams ---------------------------------------------------------------

  const generateExam = useCallback(
    (params: ExamParams, onComplete?: (examId: string) => void) => {
      const toastId = toast.loading("Generating practice exam...");
      markActive("exams", params.subjectId);

      fetch("/api/study/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType: params.sourceType,
          sourceIds: params.sourceIds,
          ...(params.subjectId ? { subjectId: params.subjectId } : {}),
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to generate exam");
          }
          return res.json();
        })
        .then(({ exam }) => {
          toast.success(`Exam "${exam.title}" ready!`, { id: toastId });
          callRefresh("exams", params.subjectId);
          onComplete?.(exam.id);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Exam generation failed",
            { id: toastId }
          );
        })
        .finally(() => {
          markDone("exams", params.subjectId);
        });
    },
    []
  );

  // ---- Slides --------------------------------------------------------------

  const generateSlides = useCallback(
    (
      params: SlideParams,
      onComplete?: (deckId: string, slideCount: number) => void
    ) => {
      const toastId = toast.loading("Generating slides...");
      markActive("slides", params.subjectId);

      fetch("/api/study/slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subjectId: params.subjectId,
          title: params.title,
          slideCount: params.slideCount,
          sourceType: params.sourceType,
          sourceIds: params.sourceIds,
          template: params.template,
          generateImages: params.generateImages,
        }),
      })
        .then(async (res) => {
          if (!res.ok) {
            const data = await res.json();
            throw new Error(data.error || "Failed to generate slides");
          }
          return res.json();
        })
        .then((data) => {
          toast.success(`Slide deck ready!`, { id: toastId });
          callRefresh("slides", params.subjectId);
          onComplete?.(data.deckId, data.slideCount ?? params.slideCount);
        })
        .catch((err) => {
          toast.error(
            err instanceof Error ? err.message : "Slide generation failed",
            { id: toastId }
          );
        })
        .finally(() => {
          markDone("slides", params.subjectId);
        });
    },
    []
  );

  // ---- Utilities -----------------------------------------------------------

  const isGenerating = useCallback(
    (type: GenerationType, subjectId?: string) => {
      return activeRef.current.has(`${type}:${subjectId ?? "all"}`);
    },
    []
  );

  const registerRefresh = useCallback(
    (subjectId: string, callbacks: Partial<RefreshCallbacks>) => {
      refreshRef.current.set(subjectId, {
        ...refreshRef.current.get(subjectId),
        ...callbacks,
      });
      return () => {
        refreshRef.current.delete(subjectId);
      };
    },
    []
  );

  return (
    <GenerationContext.Provider
      value={{
        generateFlashcards,
        generateExam,
        generateSlides,
        isGenerating,
        registerRefresh,
      }}
    >
      {children}
    </GenerationContext.Provider>
  );
}
