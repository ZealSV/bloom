"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { buildVoiceInstructions } from "@/lib/realtime-prompts";

export interface TranscriptMessage {
  role: "student" | "bloom";
  content: string;
  timestamp: number;
}

export type RealtimeStatus =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "thinking";

interface UseRealtimeVoiceOptions {
  sessionId: string;
  topic: string;
}

interface UseRealtimeVoiceReturn {
  status: RealtimeStatus;
  connect: () => Promise<void>;
  disconnect: () => void;
  transcript: TranscriptMessage[];
  error: string | null;
  elapsedSeconds: number;
}

export function useRealtimeVoice({
  sessionId,
  topic,
}: UseRealtimeVoiceOptions): UseRealtimeVoiceReturn {
  const [status, setStatus] = useState<RealtimeStatus>("idle");
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const dcRef = useRef<RTCDataChannel | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const transcriptRef = useRef<TranscriptMessage[]>([]);
  const currentBloomText = useRef("");

  const disconnect = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Stop mic
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    // Close data channel
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }

    // Close peer connection
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }

    // Cleanup audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current = null;
    }

    setStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setElapsedSeconds(0);
    transcriptRef.current = [];
    setTranscript([]);
    currentBloomText.current = "";

    try {
      // 1. Get ephemeral token
      const tokenRes = await fetch("/api/realtime/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, voice: "nova" }),
      });

      if (!tokenRes.ok) {
        const errData = await tokenRes.json().catch(() => ({}));
        throw new Error(errData.details || errData.error || "Failed to create realtime session");
      }

      const { clientSecret } = await tokenRes.json();
      if (!clientSecret) {
        throw new Error("No client secret returned");
      }

      // 2. Get microphone
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // 3. Create peer connection
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // 4. Setup remote audio playback
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audioRef.current = audio;

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
      };

      // 5. Add mic track
      stream.getTracks().forEach((track) => {
        pc.addTrack(track, stream);
      });

      // 6. Create data channel
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // Configure session
        const sessionUpdate = {
          type: "session.update",
          session: {
            instructions: buildVoiceInstructions(topic),
            input_audio_transcription: {
              model: "whisper-1",
            },
            turn_detection: {
              type: "server_vad",
              threshold: 0.5,
              prefix_padding_ms: 300,
              silence_duration_ms: 500,
            },
          },
        };
        dc.send(JSON.stringify(sessionUpdate));
        setStatus("listening");

        // Start timer
        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      };

      dc.onmessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);

          switch (data.type) {
            case "input_audio_buffer.speech_started":
              setStatus("listening");
              break;

            case "input_audio_buffer.speech_stopped":
              setStatus("thinking");
              break;

            case "response.audio_transcript.delta":
              currentBloomText.current += data.delta || "";
              break;

            case "response.audio_transcript.done": {
              const text = data.transcript || currentBloomText.current;
              if (text.trim()) {
                transcriptRef.current.push({
                  role: "bloom",
                  content: text.trim(),
                  timestamp: Date.now(),
                });
                setTranscript([...transcriptRef.current]);
              }
              currentBloomText.current = "";
              break;
            }

            case "conversation.item.input_audio_transcription.completed": {
              const userText = data.transcript;
              if (userText?.trim()) {
                transcriptRef.current.push({
                  role: "student",
                  content: userText.trim(),
                  timestamp: Date.now(),
                });
                setTranscript([...transcriptRef.current]);
              }
              break;
            }

            case "response.created":
              setStatus("speaking");
              break;

            case "response.done":
              setStatus("listening");
              break;

            case "error":
              setError(data.error?.message || "Realtime API error");
              break;
          }
        } catch {
          // Skip malformed messages
        }
      };

      dc.onerror = () => {
        setError("Data channel error");
      };

      // 7. SDP exchange
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        }
      );

      if (!sdpRes.ok) {
        throw new Error("SDP exchange failed");
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to connect";
      setError(message);
      disconnect();
    }
  }, [sessionId, topic, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pcRef.current) {
        streamRef.current?.getTracks().forEach((t) => t.stop());
        dcRef.current?.close();
        pcRef.current.close();
        audioRef.current?.pause();
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };
  }, []);

  return { status, connect, disconnect, transcript, error, elapsedSeconds };
}
