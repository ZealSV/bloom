"use client";

import { useState, useCallback } from "react";
import type { Message, Concept, Gap, ConceptRelationship } from "./useSession";

interface bloomAnalysis {
  concepts_discussed: {
    name: string;
    mastery_score: number;
    evidence: string;
  }[];
  gaps_detected: { concept: string; description: string }[];
  concept_relationships: {
    from: string;
    to: string;
    relationship: string;
  }[];
  overall_session_mastery: number;
}

interface UseStreamingChatProps {
  sessionId: string | null;
  onMessage: (messages: Message[]) => void;
  onAnalysis: (analysis: bloomAnalysis) => void;
  onComplete?: (text: string) => void;
}

/** Strip JSON analysis blocks from streaming content so they don't flash in the UI */
function stripJsonBlock(text: string): string {
  const jsonStart = text.indexOf("```json");
  if (jsonStart !== -1) {
    return text.slice(0, jsonStart).trim();
  }
  // Catch partial opening markers at the very end (e.g. "```j", "```")
  const trailing = text.match(/`{1,3}[a-z]{0,4}$/);
  if (trailing && trailing.index !== undefined && text.length - trailing.index < 10) {
    return text.slice(0, trailing.index).trim();
  }
  return text;
}

export function useStreamingChat({
  sessionId,
  onMessage,
  onAnalysis,
  onComplete,
}: UseStreamingChatProps) {
  const [isStreaming, setIsStreaming] = useState(false);

  const sendMessage = useCallback(
    async (content: string, currentMessages: Message[]) => {
      if (!sessionId || !content.trim() || isStreaming) return;

      setIsStreaming(true);

      // Add student message immediately
      const studentMsg: Message = {
        session_id: sessionId,
        role: "student",
        content: content.trim(),
      };

      // Add a placeholder for bloom's response
      const bloomPlaceholder: Message = {
        session_id: sessionId,
        role: "bloom",
        content: "",
        isStreaming: true,
      };

      const newMessages = [...currentMessages, studentMsg, bloomPlaceholder];
      onMessage(newMessages);

      try {
        const response = await fetch(`/api/sessions/${sessionId}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content.trim() }),
        });

        if (!response.ok) {
          throw new Error("Chat request failed");
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No reader");

        const decoder = new TextDecoder();
        let bloomContent = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "text") {
                  bloomContent += data.content;
                  const displayContent = stripJsonBlock(bloomContent);
                  const updated = [...newMessages];
                  updated[updated.length - 1] = {
                    ...bloomPlaceholder,
                    content: displayContent,
                  };
                  onMessage([...updated]);
                } else if (data.type === "analysis") {
                  onAnalysis(data.content);
                } else if (data.type === "done") {
                  const finalContent = data.chatMessage || bloomContent;
                  const updated = [...newMessages];
                  updated[updated.length - 1] = {
                    ...bloomPlaceholder,
                    content: finalContent,
                    isStreaming: false,
                  };
                  onMessage([...updated]);
                  onComplete?.(finalContent);
                } else if (data.type === "error") {
                  const updated = [...newMessages];
                  updated[updated.length - 1] = {
                    ...bloomPlaceholder,
                    content:
                      "Sorry, I got a bit confused there. Could you try explaining that again?",
                    isStreaming: false,
                  };
                  onMessage([...updated]);
                }
              } catch {
                // Skip malformed JSON
              }
            }
          }
        }
      } catch (error) {
        const updated = [...newMessages];
        updated[updated.length - 1] = {
          ...bloomPlaceholder,
          content: "Hmm, something went wrong on my end. Could you try again?",
          isStreaming: false,
        };
        onMessage([...updated]);
      } finally {
        setIsStreaming(false);
      }
    },
    [sessionId, isStreaming, onMessage, onAnalysis, onComplete],
  );

  return { sendMessage, isStreaming };
}
