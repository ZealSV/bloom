"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ChatMessageProps {
  role: "student" | "bloom";
  content: string;
  isStreaming?: boolean;
  citations?: {
    chunkId: number | null;
    documentId: string;
    documentTitle: string;
    snippet: string;
    score: number;
  }[];
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
  citations,
}: ChatMessageProps) {
  const isbloom = role === "bloom";
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const hasSources = !!citations && citations.length > 0;

  return (
    <motion.div
      className={`flex gap-3 ${isbloom ? "justify-start" : "justify-end"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {isbloom && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <Image src="/bloomlogo.png" alt="bloom" width={16} height={16} className="rounded-sm" />
        </div>
      )}

      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isbloom
            ? "bg-card border border-border rounded-tl-md"
            : "bg-primary/10 border border-primary/20 rounded-tr-md"
        }`}
      >
        <p
          className={`text-sm leading-relaxed whitespace-pre-wrap ${
            isbloom ? "text-foreground" : "text-[hsl(139_40%_56%)] dark:text-primary"
          }`}
        >
          {content}
          {isStreaming && (
            <motion.span
              className="inline-block w-1.5 h-4 bg-primary/60 ml-0.5 rounded-sm"
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </p>
        {isbloom && hasSources && !isStreaming && (
          <div className="mt-3 border-t border-border/70 pt-2.5 space-y-1.5">
            <button
              type="button"
              onClick={() => setSourcesOpen((v) => !v)}
              className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-muted-foreground hover:text-foreground transition-colors"
            >
              Sources
              {sourcesOpen ? (
                <ChevronUp className="h-3 w-3" />
              ) : (
                <ChevronDown className="h-3 w-3" />
              )}
            </button>
            {sourcesOpen && (
              <div className="space-y-1.5">
                {citations.map((citation, index) => (
                  <div key={`${citation.documentId}-${citation.chunkId}-${index}`} className="text-xs">
                    <p className="text-muted-foreground">
                      {index + 1}. {citation.documentTitle}
                      {Number.isFinite(citation.chunkId) ? ` (chunk ${citation.chunkId})` : ""}
                      {" · "}score {citation.score.toFixed(2)}
                    </p>
                    <p className="text-foreground/80">
                      {citation.snippet}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {!isbloom && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          >
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
      )}
    </motion.div>
  );
}
