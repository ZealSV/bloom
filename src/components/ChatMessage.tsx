"use client";

import { motion } from "framer-motion";

interface ChatMessageProps {
  role: "student" | "bloom";
  content: string;
  isStreaming?: boolean;
}

export default function ChatMessage({
  role,
  content,
  isStreaming,
}: ChatMessageProps) {
  const isbloom = role === "bloom";

  return (
    <motion.div
      className={`flex gap-3 ${isbloom ? "justify-start" : "justify-end"}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
    >
      {isbloom && (
        <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mt-1">
          <span className="text-sm">🌱</span>
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
            isbloom ? "text-foreground" : "text-primary"
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
