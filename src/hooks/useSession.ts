"use client";

import { useState, useCallback } from "react";

export interface Session {
  id: string;
  topic: string;
  subject_area: string | null;
  created_at: string;
  updated_at: string;
  status: string;
}

export interface Message {
  id?: number;
  session_id: string;
  role: "student" | "bloom";
  content: string;
  created_at?: string;
  isStreaming?: boolean;
  citations?: {
    chunkId: number | null;
    documentId: string;
    documentTitle: string;
    snippet: string;
    score: number;
  }[];
}

export interface Concept {
  id: number;
  session_id: string;
  name: string;
  mastery_score: number;
  status: string;
  parent_concept: string | null;
  updated_at: string;
}

export interface Gap {
  id: number;
  session_id: string;
  concept_name: string;
  description: string | null;
  resolved: boolean;
  detected_at: string;
}

export interface ConceptRelationship {
  id: number;
  from_concept: string;
  to_concept: string;
  relationship: string;
  reasoning?: string | null;
}

export function useSession() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [concepts, setConcepts] = useState<Concept[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [relationships, setRelationships] = useState<ConceptRelationship[]>([]);
  const [sessionMastery, setSessionMastery] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/sessions");
      const data = await res.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch {
      setSessions([]);
    }
  }, []);

  const createSession = useCallback(
    async (topic: string, subjectArea?: string) => {
      setLoading(true);
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, subject_area: subjectArea }),
      });
      const data = await res.json();
      setCurrentSession(data);
      setMessages([]);
      setConcepts([]);
      setGaps([]);
      setRelationships([]);
      setLoading(false);
      await fetchSessions();
      return data;
    },
    [fetchSessions],
  );

  const loadSession = useCallback(async (id: string) => {
    setLoading(true);
    const res = await fetch(`/api/sessions/${id}`);
    const data = await res.json();
    setCurrentSession(data.session);
    setMessages(data.messages);
    setConcepts(data.concepts);
    setGaps(data.gaps);
    setRelationships(data.relationships);
    setLoading(false);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      await fetch(`/api/sessions/${id}`, { method: "DELETE" });
      if (currentSession?.id === id) {
        setCurrentSession(null);
        setMessages([]);
        setConcepts([]);
        setGaps([]);
        setRelationships([]);
      }
      await fetchSessions();
    },
    [currentSession, fetchSessions],
  );

  const refreshMastery = useCallback(async () => {
    if (!currentSession) return;
    const res = await fetch(`/api/sessions/${currentSession.id}/mastery`);
    const data = await res.json();
    setConcepts(data.concepts);
    setGaps(data.gaps);
  }, [currentSession]);

  const refreshConcepts = useCallback(async () => {
    if (!currentSession) return;
    const res = await fetch(`/api/sessions/${currentSession.id}/concepts`);
    const data = await res.json();
    setConcepts(data.concepts);
    setRelationships(data.relationships);
  }, [currentSession]);

  return {
    sessions,
    currentSession,
    messages,
    concepts,
    gaps,
    relationships,
    loading,
    setMessages,
    setConcepts,
    setGaps,
    setRelationships,
    sessionMastery,
    setSessionMastery,
    fetchSessions,
    createSession,
    loadSession,
    deleteSession,
    refreshMastery,
    refreshConcepts,
  };
}
