"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AudioWaveform from "./AudioWaveform";
import { useLectureRecorder } from "@/hooks/useLectureRecorder";

interface LectureRecorderProps {
  onComplete?: (lectureId: string) => void;
  onCancel?: () => void;
  subjectId?: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export default function LectureRecorder({ onComplete, subjectId }: LectureRecorderProps) {
  const [title, setTitle] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const {
    status,
    lectureId,
    transcript,
    elapsedSeconds,
    error,
    analyserNode,
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
  } = useLectureRecorder({ chunkIntervalMs: 60_000, subjectId });

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

  useEffect(() => {
    if (status === "done" && lectureId && onComplete) {
      onComplete(lectureId);
    }
  }, [status, lectureId, onComplete]);

  if (status === "idle") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4">
            <Mic className="h-6 w-6 text-primary" />
          </div>
          <h3 className="font-outfit text-lg font-semibold text-foreground mb-1">
            Record a Lecture
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Capture audio and get a live transcript with AI-powered notes
          </p>
          <div className="max-w-sm mx-auto space-y-3">
            <Input
              placeholder="Lecture title (optional)"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-center"
            />
            <Button
              onClick={() => startRecording(title)}
              className="w-full bg-primary hover:bg-primary/90"
            >
              <Mic className="mr-2 h-4 w-4" />
              Start Recording
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (status === "processing") {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <div className="text-center py-8">
          <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Processing final audio...
          </p>
        </div>
      </div>
    );
  }

  if (status === "done") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="rounded-2xl border border-primary/30 bg-primary/5 p-6"
      >
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/20 mb-3">
            <Mic className="h-5 w-5 text-primary" />
          </div>
          <p className="font-medium text-foreground mb-1">Lecture saved!</p>
          <p className="text-sm text-muted-foreground">
            {formatTime(elapsedSeconds)} recorded
          </p>
        </div>
      </motion.div>
    );
  }

  // Recording or paused state
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header with timer */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            {status === "recording" ? (
              <motion.div
                key="recording"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 rounded-full bg-red-500"
              >
                <motion.div
                  className="w-3 h-3 rounded-full bg-red-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.div>
            ) : (
              <motion.div
                key="paused"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-3 h-3 rounded-full bg-yellow-500"
              />
            )}
          </AnimatePresence>
          <span className="text-sm font-medium text-foreground">
            {status === "recording" ? "Recording" : "Paused"}
          </span>
        </div>
        <span className="font-mono text-lg text-foreground tabular-nums">
          {formatTime(elapsedSeconds)}
        </span>
      </div>

      {/* Waveform */}
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <AudioWaveform
          analyserNode={analyserNode}
          isActive={status === "recording"}
        />
      </div>

      {/* Live transcript */}
      <div className="p-4 max-h-48 overflow-y-auto">
        {transcript ? (
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
            {transcript}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic">
            Transcript will appear here as you speak...
          </p>
        )}
        <div ref={transcriptEndRef} />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-3 p-4 border-t border-border">
        {status === "recording" ? (
          <Button variant="outline" size="sm" onClick={pauseRecording}>
            <Pause className="mr-1.5 h-3.5 w-3.5" />
            Pause
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={resumeRecording}>
            <Play className="mr-1.5 h-3.5 w-3.5" />
            Resume
          </Button>
        )}
        <Button
          variant="destructive"
          size="sm"
          onClick={stopRecording}
        >
          <Square className="mr-1.5 h-3.5 w-3.5" />
          Stop
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
    </div>
  );
}
