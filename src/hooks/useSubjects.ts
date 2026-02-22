"use client";

import { useState, useCallback } from "react";
import type { Subject } from "@/types/study";

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSubjects = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subjects");
      if (res.ok) {
        const data = await res.json();
        setSubjects(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const createSubject = useCallback(
    async (name: string, color?: string) => {
      const res = await fetch("/api/subjects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, color }),
      });
      if (res.ok) {
        const subject = await res.json();
        setSubjects((prev) => [subject, ...prev]);
        return subject;
      }
      return null;
    },
    []
  );

  const deleteSubject = useCallback(async (id: string) => {
    const res = await fetch(`/api/subjects/${id}`, { method: "DELETE" });
    if (res.ok) {
      setSubjects((prev) => prev.filter((s) => s.id !== id));
    }
  }, []);

  const updateSubject = useCallback(
    async (id: string, updates: { name?: string; color?: string }) => {
      const res = await fetch(`/api/subjects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const updated = await res.json();
        setSubjects((prev) =>
          prev.map((s) => (s.id === id ? { ...s, ...updated } : s))
        );
      }
    },
    []
  );

  return {
    subjects,
    loading,
    fetchSubjects,
    createSubject,
    deleteSubject,
    updateSubject,
  };
}
