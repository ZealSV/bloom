"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import Image from "next/image";
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

const MIN_STATUS_DISPLAY_MS = 1000;

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

const mascotByStatus: Record<RealtimeStatus, string> = {
  idle: "/bloom_default.png",
  connecting: "/bloom_awestruck.png",
  listening: "/bloom_curious.png",
  thinking: "/bloom_zen.png",
  speaking: "/bloom_happy.png",
};

const mascotVariants = {
  connecting: {
    scale: [0.9, 1.02, 0.9],
    rotate: [-2, 2, -2],
    transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
  },
  listening: {
    scale: [1, 1.06, 1],
    rotate: [0, 1.5, 0],
    transition: { duration: 2.5, repeat: Infinity, ease: "easeInOut" },
  },
  thinking: {
    scale: [1, 1.03, 1],
    rotate: [0, -1.2, 0],
    transition: { duration: 1.5, repeat: Infinity, ease: "easeInOut" },
  },
  speaking: {
    scale: [1, 1.1, 0.96, 1.08, 1],
    rotate: [0, 2, -1, 2, 0],
    transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" },
  },
  idle: {
    scale: 1,
    rotate: 0,
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
  const pendingStatusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const lastStatusSwapRef = useRef<number>(Date.now());

  const { status, connect, disconnect, transcript, error, elapsedSeconds } =
    useRealtimeVoice({
      sessionId,
      topic,
      onBye: () => exitRef.current?.(),
    });
  const [displayStatus, setDisplayStatus] = useState<RealtimeStatus>("idle");

  // Keep transcript ref current so handleExit captures latest
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  useEffect(() => {
    if (status === displayStatus) return;

    const applyStatus = () => {
      setDisplayStatus(status);
      lastStatusSwapRef.current = Date.now();
      pendingStatusTimeoutRef.current = null;
    };

    const elapsed = Date.now() - lastStatusSwapRef.current;
    if (elapsed >= MIN_STATUS_DISPLAY_MS) {
      if (pendingStatusTimeoutRef.current) {
        clearTimeout(pendingStatusTimeoutRef.current);
        pendingStatusTimeoutRef.current = null;
      }
      applyStatus();
      return;
    }

    if (pendingStatusTimeoutRef.current) {
      clearTimeout(pendingStatusTimeoutRef.current);
      pendingStatusTimeoutRef.current = null;
    }

    pendingStatusTimeoutRef.current = setTimeout(
      applyStatus,
      MIN_STATUS_DISPLAY_MS - elapsed
    );
  }, [status, displayStatus]);

  useEffect(() => {
    return () => {
      if (pendingStatusTimeoutRef.current) {
        clearTimeout(pendingStatusTimeoutRef.current);
      }
    };
  }, []);

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

  const animateKey = displayStatus === "idle" ? "idle" : displayStatus;

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
          <div className="flex items-center gap-3">
            <p className="hidden sm:block text-xs text-muted-foreground">
              Say “bye” to end, or click Stop
            </p>
            <button
              onClick={handleExit}
              className="px-3 py-1.5 rounded-xl border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="End session"
            >
              Stop
            </button>
            <button
              onClick={handleExit}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              title="End session"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Center: Mascot */}
        <div className="flex-1 flex flex-col items-center justify-center pb-10">
          <div className="relative flex items-center justify-center">
            {/* Status mascot */}
            <motion.div
              className="relative h-52 w-52"
              variants={mascotVariants}
              animate={animateKey}
            >
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={displayStatus}
                  className="absolute inset-0"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  <Image
                    src={mascotByStatus[displayStatus]}
                    alt={`bloom ${displayStatus}`}
                    fill
                    sizes="208px"
                    priority
                    className="object-contain"
                  />
                </motion.div>
              </AnimatePresence>
            </motion.div>
          </div>

          {/* Status text */}
          <motion.p
            className="mt-8 text-sm text-muted-foreground"
            key={displayStatus}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {statusLabel(displayStatus)}
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
