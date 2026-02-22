"use client";

import { useState, useCallback } from "react";
import type { PracticeExam, ExamAttempt } from "@/types/study";

export function useExam() {
  const [exams, setExams] = useState<PracticeExam[]>([]);
  const [currentExam, setCurrentExam] = useState<PracticeExam | null>(null);
  const [attempts, setAttempts] = useState<ExamAttempt[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchExams = useCallback(async (subjectId?: string) => {
    setLoading(true);
    try {
      const url = subjectId
        ? `/api/study/exams?subject_id=${subjectId}`
        : "/api/study/exams";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setExams(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchExam = useCallback(async (examId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study/exams/${examId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentExam(data.exam);
        setAttempts(data.attempts);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const submitExam = useCallback(
    async (answers: Record<number, string>) => {
      if (!currentExam) return null;
      setLoading(true);
      try {
        const res = await fetch(
          `/api/study/exams/${currentExam.id}/submit`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ answers }),
          }
        );
        if (res.ok) {
          const data = await res.json();
          setAttempts((prev) => [data.attempt, ...prev]);
          return data;
        }
        return null;
      } finally {
        setLoading(false);
      }
    },
    [currentExam]
  );

  return {
    exams,
    currentExam,
    attempts,
    loading,
    fetchExams,
    fetchExam,
    submitExam,
    setCurrentExam,
  };
}
