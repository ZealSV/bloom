"use client";

import { useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  useRealtimeVoice,
  stopAllStreams,
  type TranscriptMessage,
  type RealtimeStatus,
} from "@/hooks/useRealtimeVoice";

interface LiveVoiceModeProps {
  sessionId: string;
  topic: string;
  onExit: (transcript: TranscriptMessage[]) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

function statusLabel(status: RealtimeStatus): string {
  switch (status) {
    case "connecting":
      return "Connecting...";
    case "listening":
      return "Listening...";
    case "thinking":
      return "Thinking...";
    case "speaking":
      return "bloom is speaking...";
    default:
      return "";
  }
}

const orbVariants = {
  connecting: {
    scale: [0.85, 1, 0.85],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scale: [1, 1.06, 1],
    opacity: [0.9, 1, 0.9],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    scale: [1, 1.03, 1],
    opacity: [0.6, 1, 0.6],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scale: [1, 1.18, 0.95, 1.12, 1],
    opacity: [0.9, 1, 0.85, 1, 0.9],
    transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
  },
  idle: {
    scale: 1,
    opacity: 0.5,
  },
};

const glowVariants = {
  connecting: {
    scale: [1, 1.3, 1],
    opacity: [0, 0.15, 0],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scale: [1, 1.2, 1],
    opacity: [0, 0.1, 0],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    scale: [1, 1.15, 1],
    opacity: [0, 0.08, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scale: [1, 1.5, 1.1, 1.4, 1],
    opacity: [0, 0.25, 0.05, 0.2, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
  },
  idle: {
    scale: 1,
    opacity: 0,
  },
};

export default function LiveVoiceMode({
  sessionId,
  topic,
  onExit,
}: LiveVoiceModeProps) {
  // Ref indirection to break circular dependency:
  // handleExit needs disconnect (from hook), hook needs onBye (handleExit)
  const exitRef = useRef<() => void>();

  const { status, connect, disconnect, transcript, error, elapsedSeconds } =
    useRealtimeVoice({
      sessionId,
      topic,
      onBye: () => exitRef.current?.(),
    });

  // Keep transcript ref current so handleExit captures latest
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  const handleExit = useCallback(() => {
    disconnect();
    // Nuclear cleanup — guarantees mic release regardless of ref state
    stopAllStreams();
    onExit(transcriptRef.current);
  }, [disconnect, onExit]);

  // Keep exitRef pointing to latest handleExit
  useEffect(() => {
    exitRef.current = handleExit;
  }, [handleExit]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animateKey = status === "idle" ? "idle" : status;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 bg-background flex flex-col"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted-foreground truncate max-w-[240px]">
              {topic}
            </p>
            {status !== "idle" && status !== "connecting" && (
              <span className="text-sm font-mono text-muted-foreground">
                {formatTime(elapsedSeconds)}
              </span>
            )}
          </div>
          <button
            onClick={handleExit}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="End session"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Center: Orb */}
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="relative flex items-center justify-center">
            {/* Glow layer */}
            <motion.div
              className="absolute w-40 h-40 rounded-full bg-primary/30 blur-2xl"
              variants={glowVariants}
              animate={animateKey}
            />

            {/* Main orb */}
            <motion.div
              className="relative w-36 h-36 rounded-full bg-gradient-to-br from-primary/80 to-primary/40 border border-primary/20 shadow-lg shadow-primary/10"
              variants={orbVariants}
              animate={animateKey}
            />
          </div>

          {/* Status text */}
          <motion.p
            className="mt-8 text-sm text-muted-foreground"
            key={status}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {statusLabel(status)}
          </motion.p>

          {/* Error */}
          {error && (
            <motion.p
              className="mt-3 text-sm text-destructive max-w-sm text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Live transcript */}
        <div className="px-6 pb-6">
          <div className="max-w-3xl mx-auto rounded-2xl border border-border bg-card/60 backdrop-blur px-4 py-3 h-36 overflow-y-auto">
            {transcript.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Start talking — I&apos;ll show the transcript here.
              </p>
            ) : (
              <div className="space-y-2 text-sm">
                {transcript.slice(-6).map((item) => (
                  <div key={item.timestamp} className="flex items-start gap-2">
                    <span className="text-xs text-muted-foreground mt-0.5">
                      {item.role === "student" ? "You" : "bloom"}
                    </span>
                    <p className="text-foreground leading-snug">{item.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
