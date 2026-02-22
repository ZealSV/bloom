"use client";

import { useState, useRef, useCallback, useEffect } from "react";

export type RecorderStatus =
  | "idle"
  | "recording"
  | "paused"
  | "processing"
  | "done";

interface UseLectureRecorderOptions {
  chunkIntervalMs?: number;
  subjectId?: string;
}

export function useLectureRecorder(opts: UseLectureRecorderOptions = {}) {
  const { chunkIntervalMs = 30_000, subjectId } = opts;

  const [status, setStatus] = useState<RecorderStatus>("idle");
  const [lectureId, setLectureId] = useState<string | null>(null);
  const [transcript, setTranscript] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [analyserNode, setAnalyserNode] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const chunkTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lectureIdRef = useRef<string | null>(null);
  const transcriptRef = useRef("");
  const isSendingRef = useRef(false);
  const pendingBlobRef = useRef<Blob | null>(null);
  const isCyclingRef = useRef(false);

  const sendChunkToWhisper = useCallback(async (blob: Blob) => {
    if (!lectureIdRef.current || blob.size < 1000) return;

    if (isSendingRef.current) {
      pendingBlobRef.current = blob;
      return;
    }

    isSendingRef.current = true;

    try {
      const formData = new FormData();
      formData.append("audio", blob, "chunk.webm");

      const res = await fetch(
        `/api/lectures/${lectureIdRef.current}/transcribe`,
        { method: "POST", body: formData }
      );

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transcription failed");
      }

      const data = await res.json();
      transcriptRef.current = data.fullTranscript;
      setTranscript(data.fullTranscript);
    } catch (err) {
      console.error("Chunk transcription error:", err);
      setError(err instanceof Error ? err.message : "Transcription error");
    } finally {
      isSendingRef.current = false;

      if (pendingBlobRef.current) {
        const pending = pendingBlobRef.current;
        pendingBlobRef.current = null;
        sendChunkToWhisper(pending);
      }
    }
  }, []);

  // Cycle the recorder: stop -> collect chunks -> send -> restart
  const cycleRecorder = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording" || isCyclingRef.current) return;

    isCyclingRef.current = true;
    const mimeType = recorder.mimeType || "audio/webm";

    // Use a one-time onstop handler so we process data only after it's available
    const prevOnStop = recorder.onstop;
    recorder.onstop = () => {
      // ondataavailable has already fired by the time onstop fires
      if (chunksRef.current.length > 0) {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        chunksRef.current = [];
        sendChunkToWhisper(blob);
      }

      // Restart recording if stream is still active
      if (streamRef.current?.active && mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.start();
        } catch {
          // Recorder may have been disposed
        }
      }

      // Restore previous handler
      recorder.onstop = prevOnStop;
      isCyclingRef.current = false;
    };

    recorder.stop();
  }, [sendChunkToWhisper]);

  const startRecording = useCallback(
    async (title?: string) => {
      setError(null);
      setTranscript("");
      transcriptRef.current = "";
      setElapsedSeconds(0);

      try {
        const res = await fetch("/api/lectures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title || "Untitled Lecture",
            ...(subjectId ? { subject_id: subjectId } : {}),
          }),
        });
        if (!res.ok) throw new Error("Failed to create lecture");
        const lecture = await res.json();
        setLectureId(lecture.id);
        lectureIdRef.current = lecture.id;

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        streamRef.current = stream;

        const audioCtx = new AudioContext();
        audioContextRef.current = audioCtx;
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        setAnalyserNode(analyser);

        const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;
        chunksRef.current = [];

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            chunksRef.current.push(e.data);
          }
        };

        recorder.start();
        setStatus("recording");

        // Periodically cycle the recorder to send chunks for transcription
        chunkTimerRef.current = setInterval(() => {
          cycleRecorder();
        }, chunkIntervalMs);

        elapsedTimerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to start recording"
        );
        setStatus("idle");
      }
    },
    [chunkIntervalMs, cycleRecorder, subjectId]
  );

  const pauseRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "recording") {
      recorder.pause();
      setStatus("paused");
      if (elapsedTimerRef.current) {
        clearInterval(elapsedTimerRef.current);
        elapsedTimerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state === "paused") {
      recorder.resume();
      setStatus("recording");
      elapsedTimerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    }
  }, []);

  const stopRecording = useCallback(async () => {
    setStatus("processing");

    if (chunkTimerRef.current) {
      clearInterval(chunkTimerRef.current);
      chunkTimerRef.current = null;
    }
    if (elapsedTimerRef.current) {
      clearInterval(elapsedTimerRef.current);
      elapsedTimerRef.current = null;
    }

    // Wait for any in-progress cycling to finish
    let cycleWait = 0;
    while (isCyclingRef.current && cycleWait < 50) {
      await new Promise((r) => setTimeout(r, 100));
      cycleWait++;
    }

    const recorder = mediaRecorderRef.current;
    const mimeType = recorder?.mimeType || "audio/webm";

    if (recorder && recorder.state !== "inactive") {
      await new Promise<void>((resolve) => {
        recorder.onstop = () => resolve();
        recorder.stop();
      });
    }

    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      chunksRef.current = [];
      await sendChunkToWhisper(blob);
    }

    // Wait for pending sends
    let waitAttempts = 0;
    while (isSendingRef.current && waitAttempts < 30) {
      await new Promise((r) => setTimeout(r, 200));
      waitAttempts++;
    }

    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    setAnalyserNode(null);

    if (lectureIdRef.current) {
      await fetch(`/api/lectures/${lectureIdRef.current}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ready" }),
      });
    }

    setStatus("done");
  }, [sendChunkToWhisper]);

  useEffect(() => {
    return () => {
      if (chunkTimerRef.current) clearInterval(chunkTimerRef.current);
      if (elapsedTimerRef.current) clearInterval(elapsedTimerRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      audioContextRef.current?.close();
    };
  }, []);

  return {
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
  };
}
