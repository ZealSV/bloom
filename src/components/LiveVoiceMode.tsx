"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import {
  useRealtimeVoice,
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
  const { status, connect, disconnect, transcript, error, elapsedSeconds } =
    useRealtimeVoice({ sessionId, topic });

  // Auto-connect on mount
  useEffect(() => {
    connect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExit = useCallback(() => {
    disconnect();
    onExit(transcript);
  }, [disconnect, onExit, transcript]);

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
        <div className="flex-1 flex flex-col items-center justify-center pb-28">
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
      </motion.div>
    </AnimatePresence>
  );
}
