"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import { useStreamingChat } from "@/hooks/useStreamingChat";
import { useTextToSpeech } from "@/hooks/useTextToSpeech";
import Layout from "@/components/Layout";
import SessionHistory from "@/components/SessionHistory";
import TopicPicker, { type TeachingMode } from "@/components/TopicPicker";
import Chat from "@/components/Chat";
import LiveVoiceMode from "@/components/LiveVoiceMode";
import type { TranscriptMessage } from "@/hooks/useRealtimeVoice";
import { createClient } from "@/lib/supabase-browser";

export default function AppPage() {
  const {
    sessions,
    currentSession,
    messages,
    concepts,
    loading,
    setMessages,
    setConcepts,
    setGaps,
    setRelationships,
    fetchSessions,
    createSession,
    loadSession,
    deleteSession,
  } = useSession();

  const [showPicker, setShowPicker] = useState(true);
  const [voiceMode, setVoiceMode] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();
  const { speak, stop: stopSpeaking, isSpeaking } = useTextToSpeech();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.push("/auth/login");
      } else {
        setUser(data.user);
      }
    });
  }, [supabase, router]);

  const handleComplete = useCallback(
    (text: string) => {
      if (voiceMode) {
        speak(text);
      }
    },
    [voiceMode, speak]
  );

  const handleAnalysis = useCallback(
    (analysis: any) => {
      if (analysis.concepts_discussed) {
        setConcepts((prev) => {
          const updated = [...prev];
          for (const concept of analysis.concepts_discussed) {
            const existing = updated.findIndex(
              (c) => c.name.toLowerCase() === concept.name.toLowerCase()
            );
            if (existing >= 0) {
              updated[existing] = {
                ...updated[existing],
                mastery_score: concept.mastery_score,
                status:
                  concept.mastery_score >= 80
                    ? "mastered"
                    : concept.mastery_score >= 40
                    ? "tested"
                    : "identified",
              };
            } else {
              updated.push({
                id: Date.now() + Math.random(),
                session_id: currentSession?.id || "",
                name: concept.name,
                mastery_score: concept.mastery_score,
                status:
                  concept.mastery_score >= 80
                    ? "mastered"
                    : concept.mastery_score >= 40
                    ? "tested"
                    : "identified",
                parent_concept: null,
                updated_at: new Date().toISOString(),
              });
            }
          }
          return updated;
        });
      }

      if (analysis.gaps_detected) {
        setGaps((prev) => {
          const updated = [...prev];
          for (const gap of analysis.gaps_detected) {
            const exists = updated.some(
              (g) =>
                g.concept_name.toLowerCase() === gap.concept.toLowerCase() &&
                !g.resolved
            );
            if (!exists) {
              updated.push({
                id: Date.now() + Math.random(),
                session_id: currentSession?.id || "",
                concept_name: gap.concept,
                description: gap.description,
                resolved: false,
                detected_at: new Date().toISOString(),
              });
            }
          }
          return updated;
        });
      }

      if (analysis.concept_relationships) {
        setRelationships((prev) => {
          const updated = [...prev];
          for (const rel of analysis.concept_relationships) {
            const exists = updated.some(
              (r) =>
                r.from_concept === rel.from && r.to_concept === rel.to
            );
            if (!exists) {
              updated.push({
                id: Date.now() + Math.random(),
                from_concept: rel.from,
                to_concept: rel.to,
                relationship: rel.relationship,
              });
            }
          }
          return updated;
        });
      }
    },
    [currentSession, setConcepts, setGaps, setRelationships]
  );

  const { sendMessage, isStreaming } = useStreamingChat({
    sessionId: currentSession?.id || null,
    onMessage: setMessages,
    onAnalysis: handleAnalysis,
    onComplete: handleComplete,
  });

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  const handleNewSession = () => setShowPicker(true);

  const handleStartSession = async (
    topic: string,
    mode: TeachingMode,
    subjectArea?: string
  ) => {
    await createSession(topic, subjectArea);
    setShowPicker(false);
    if (mode === "speak") {
      setIsLiveMode(true);
    }
  };

  const handleSelectSession = async (id: string) => {
    await loadSession(id);
    setShowPicker(false);
  };

  const handleSendMessage = (content: string) => {
    sendMessage(content, messages);
  };

  const handleExitLiveMode = useCallback(
    async (transcript: TranscriptMessage[]) => {
      setIsLiveMode(false);

      if (!currentSession || transcript.length === 0) return;

      // Append transcript to local messages
      const newMessages = transcript.map((t) => ({
        session_id: currentSession.id,
        role: t.role as "student" | "bloom",
        content: t.content,
        isStreaming: false,
      }));
      setMessages((prev) => [...prev, ...newMessages]);

      // Persist and analyze
      try {
        const res = await fetch(
          `/api/sessions/${currentSession.id}/live-messages`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages: transcript }),
          }
        );
        const data = await res.json();
        if (data.analysis) {
          handleAnalysis(data.analysis);
        }
      } catch {
        // Silently fail — messages are still shown locally
      }
    },
    [currentSession, setMessages, handleAnalysis]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  const mainContent =
    showPicker || !currentSession ? (
      <TopicPicker onStart={handleStartSession} loading={loading} />
    ) : (
      <Chat
        topic={currentSession.topic}
        messages={messages}
        concepts={concepts}
        isStreaming={isStreaming}
        onSend={handleSendMessage}
        voiceMode={voiceMode}
        onVoiceModeChange={setVoiceMode}
        isSpeaking={isSpeaking}
        onStopSpeaking={stopSpeaking}
      />
    );

  return (
    <>
      <Layout
        sidebar={
          <SessionHistory
            sessions={sessions}
            currentSessionId={currentSession?.id || null}
            onSelect={handleSelectSession}
            onDelete={deleteSession}
            onNew={handleNewSession}
          />
        }
        main={mainContent}
        user={user}
        onSignOut={handleSignOut}
        onLogoClick={handleNewSession}
      />
      {isLiveMode && currentSession && (
        <LiveVoiceMode
          sessionId={currentSession.id}
          topic={currentSession.topic}
          onExit={handleExitLiveMode}
        />
      )}
    </>
  );
}
