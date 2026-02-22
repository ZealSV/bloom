"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Pause, Play, Square, Loader2, Upload, FileAudio, X } from "lucide-react";
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

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = "audio/mpeg,audio/mp3,audio/mp4,audio/m4a,audio/wav,audio/webm,audio/ogg,audio/flac,video/mp4,video/webm,video/quicktime,video/mpeg";

export default function LectureRecorder({ onComplete, onCancel, subjectId }: LectureRecorderProps) {
  const [title, setTitle] = useState("");
  const [mode, setMode] = useState<"choose" | "record" | "upload">("choose");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
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

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const maxSize = 25 * 1024 * 1024;
    if (file.size > maxSize) {
      setUploadError("File too large. Maximum size is 25MB.");
      return;
    }

    setUploadFile(file);
    setUploadError(null);
    if (!title) {
      const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
      setTitle(nameWithoutExt);
    }
  }, [title]);

  const handleUpload = useCallback(async () => {
    if (!uploadFile) return;

    setUploading(true);
    setUploadError(null);
    setUploadProgress("Uploading and transcribing...");

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("title", title || "Uploaded Lecture");
      if (subjectId) formData.append("subject_id", subjectId);

      const res = await fetch("/api/lectures/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Upload failed");
      }

      const data = await res.json();
      if (data.lecture?.id && onComplete) {
        onComplete(data.lecture.id);
      }
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setUploadProgress("");
    }
  }, [uploadFile, title, subjectId, onComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const maxSize = 25 * 1024 * 1024;
      if (file.size > maxSize) {
        setUploadError("File too large. Maximum size is 25MB.");
        return;
      }
      setUploadFile(file);
      setUploadError(null);
      if (!title) {
        const nameWithoutExt = file.name.replace(/\.[^.]+$/, "");
        setTitle(nameWithoutExt);
      }
    }
  }, [title]);

  // Idle: choose between record or upload
  if (status === "idle" && mode === "choose") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-3"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Record option */}
          <motion.button
            className="group relative rounded-2xl border border-border bg-card hover:bg-muted/50 p-6 text-left transition-colors"
            onClick={() => setMode("record")}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 mb-3">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-outfit font-semibold text-foreground mb-1">
              Record Live
            </h3>
            <p className="text-xs text-muted-foreground">
              Capture audio with live transcription
            </p>
          </motion.button>

          {/* Upload option */}
          <motion.button
            className="group relative rounded-2xl border border-border bg-card hover:bg-muted/50 p-6 text-left transition-colors"
            onClick={() => setMode("upload")}
            whileHover={{ y: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-3">
              <Upload className="h-5 w-5 text-blue-500" />
            </div>
            <h3 className="font-outfit font-semibold text-foreground mb-1">
              Upload File
            </h3>
            <p className="text-xs text-muted-foreground">
              Upload audio or video for transcription
            </p>
          </motion.button>
        </div>
      </motion.div>
    );
  }

  // Upload flow
  if (status === "idle" && mode === "upload") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Upload className="h-4 w-4 text-blue-500" />
            <h3 className="font-outfit font-semibold text-foreground">
              Upload Lecture
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => {
              setMode("choose");
              setUploadFile(null);
              setUploadError(null);
            }}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="space-y-4">
          <Input
            placeholder="Lecture title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          {/* Drop zone */}
          {!uploadFile ? (
            <div
              className="relative border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
            >
              <FileAudio className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop your file here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                MP3, MP4, M4A, WAV, WebM, OGG, FLAC, MOV — max 25MB
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_TYPES}
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-blue-500/10">
                <FileAudio className="h-5 w-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {uploadFile.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(uploadFile.size)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                onClick={() => setUploadFile(null)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {uploadError && (
            <p className="text-xs text-destructive">{uploadError}</p>
          )}

          <Button
            onClick={handleUpload}
            disabled={!uploadFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {uploadProgress}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Upload & Transcribe
              </>
            )}
          </Button>
        </div>
      </motion.div>
    );
  }

  // Record flow - title input
  if (status === "idle" && mode === "record") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mic className="h-4 w-4 text-primary" />
            <h3 className="font-outfit font-semibold text-foreground">
              Record Lecture
            </h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0"
            onClick={() => setMode("choose")}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Capture audio and get a live transcript with AI-powered notes
          </p>
          <Input
            placeholder="Lecture title (optional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Button
            onClick={() => startRecording(title)}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Mic className="mr-2 h-4 w-4" />
            Start Recording
          </Button>
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
