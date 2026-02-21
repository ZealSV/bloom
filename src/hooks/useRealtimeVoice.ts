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
  const responsePendingRef = useRef(false);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastStudentRef = useRef<{ text: string; at: number } | null>(null);

  const waitForIceGathering = useCallback((pc: RTCPeerConnection, timeoutMs = 3000) => {
    if (pc.iceGatheringState === "complete") return Promise.resolve();
    return new Promise<void>((resolve) => {
      const timeout = setTimeout(() => {
        pc.removeEventListener("icegatheringstatechange", onStateChange);
        resolve();
      }, timeoutMs);

      const onStateChange = () => {
        if (pc.iceGatheringState === "complete") {
          clearTimeout(timeout);
          pc.removeEventListener("icegatheringstatechange", onStateChange);
          resolve();
        }
      };

      pc.addEventListener("icegatheringstatechange", onStateChange);
    });
  }, []);

  const disconnect = useCallback(() => {
    // Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
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
    responsePendingRef.current = false;
  }, []);

  const connect = useCallback(async () => {
    setError(null);
    setStatus("connecting");
    setElapsedSeconds(0);
    transcriptRef.current = [];
    setTranscript([]);
    currentBloomText.current = "";
    responsePendingRef.current = false;
    lastStudentRef.current = null;

    try {
      const fail = (stage: string, err: unknown) => {
        const message =
          err instanceof Error ? err.message : String(err || "Unknown error");
        setError(`${stage}: ${message}`);
      };

      // 1. Get ephemeral token
      let clientSecret = "";
      try {
        const tokenRes = await fetch("/api/realtime/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId, voice: "shimmer" }),
        });

        if (!tokenRes.ok) {
          const errData = await tokenRes.json().catch(() => ({}));
          throw new Error(
            errData.details || errData.error || "Failed to create realtime session"
          );
        }

        const data = await tokenRes.json();
        clientSecret = data.clientSecret;
      } catch (err) {
        fail("Token request failed", err);
        throw err;
      }

      if (!clientSecret) {
        const err = new Error("No client secret returned");
        fail("Token response invalid", err);
        throw err;
      }

      // 2. Get microphone
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        fail("Microphone access denied", err);
        throw err;
      }
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
              threshold: 0.4,
              prefix_padding_ms: 250,
              silence_duration_ms: 600,
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
              if (responseTimerRef.current) {
                clearTimeout(responseTimerRef.current);
                responseTimerRef.current = null;
              }
              break;

            case "input_audio_buffer.speech_stopped":
              setStatus("thinking");
              if (responseTimerRef.current) clearTimeout(responseTimerRef.current);
              responseTimerRef.current = setTimeout(() => {
                if (
                  dcRef.current &&
                  dcRef.current.readyState === "open" &&
                  !responsePendingRef.current
                ) {
                  responsePendingRef.current = true;
                  dcRef.current.send(
                    JSON.stringify({
                      type: "response.create",
                      response: { modalities: ["audio", "text"] },
                    })
                  );
                }
              }, 700);
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
                const normalized = userText.trim().toLowerCase().replace(/\s+/g, " ");
                const now = Date.now();
                const last = lastStudentRef.current;
                const isDuplicate =
                  last && last.text === normalized && now - last.at < 5000;

                if (!isDuplicate) {
                  transcriptRef.current.push({
                    role: "student",
                    content: userText.trim(),
                    timestamp: now,
                  });
                  setTranscript([...transcriptRef.current]);
                  lastStudentRef.current = { text: normalized, at: now };
                }

                if (
                  dcRef.current &&
                  dcRef.current.readyState === "open" &&
                  !responsePendingRef.current
                ) {
                  if (responseTimerRef.current) {
                    clearTimeout(responseTimerRef.current);
                    responseTimerRef.current = null;
                  }
                  responsePendingRef.current = true;
                  dcRef.current.send(
                    JSON.stringify({
                      type: "response.create",
                      response: { modalities: ["audio", "text"] },
                    })
                  );
                  setStatus("thinking");
                }
              }
              break;
            }

            case "response.created":
              setStatus("speaking");
              break;

            case "response.done":
              setStatus("listening");
              responsePendingRef.current = false;
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

      pc.oniceconnectionstatechange = () => {
        if (
          pc.iceConnectionState === "failed" ||
          pc.iceConnectionState === "disconnected"
        ) {
          setError(`ICE connection ${pc.iceConnectionState}`);
        }
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === "failed") {
          setError("Peer connection failed");
        }
      };

      // 7. SDP exchange
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);

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
          const errText = await sdpRes.text().catch(() => "");
          throw new Error(`SDP exchange failed (${sdpRes.status}). ${errText}`);
        }

        const answerSdp = await sdpRes.text();
        await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
      } catch (err) {
        fail("Realtime SDP exchange failed", err);
        throw err;
      }
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
