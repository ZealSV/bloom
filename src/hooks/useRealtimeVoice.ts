"use client";

import { useState, useRef, useCallback, useEffect } from "react";

// Module-level set tracking every MediaStream we create.
// Guarantees mic release even if React refs get out of sync.
const activeStreams = new Set<MediaStream>();

/** Stop and remove all tracked streams — exported for external cleanup. */
export function stopAllStreams() {
  activeStreams.forEach((s) => {
    s.getTracks().forEach((t) => {
      t.enabled = false;
      t.stop();
    });
  });
  activeStreams.clear();
}

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
  onBye?: () => void;
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
  onBye,
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
  const lastStudentRef = useRef<{ text: string; at: number } | null>(null);
  const disconnectedRef = useRef(false);
  const responseActiveRef = useRef(false);
  const responseRequestedRef = useRef(false);
  const responseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastResponseAtRef = useRef(0);
  const responseRequestTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTranscriptAtRef = useRef<number>(0);
  const onByeRef = useRef(onBye);

  // Keep onBye ref current without re-creating callbacks
  useEffect(() => {
    onByeRef.current = onBye;
  }, [onBye]);

  const disconnect = useCallback(() => {
    disconnectedRef.current = true;
    responseRequestedRef.current = false;
    responseActiveRef.current = false;
    if (responseTimerRef.current) {
      clearTimeout(responseTimerRef.current);
      responseTimerRef.current = null;
    }
    if (responseRequestTimeoutRef.current) {
      clearTimeout(responseRequestTimeoutRef.current);
      responseRequestTimeoutRef.current = null;
    }

    // 1. Stop timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // 2. Cut off any playing audio (needs open data channel)
    if (dcRef.current && dcRef.current.readyState === "open") {
      try {
        dcRef.current.send(
          JSON.stringify({ type: "output_audio_buffer.clear" })
        );
      } catch {
        // Channel may already be closing
      }
    }

    // 3. Close data channel — prevents further events from arriving
    if (dcRef.current) {
      dcRef.current.onmessage = null;
      dcRef.current.onerror = null;
      dcRef.current.onopen = null;
      dcRef.current.close();
      dcRef.current = null;
    }

    // 4. Stop ALL mic tracks — this releases the browser mic indicator
    // Use module-level tracker to guarantee cleanup even if refs are stale
    stopAllStreams();
    streamRef.current = null;

    // 5. Stop all tracks on peer connection + close it
    if (pcRef.current) {
      // Stop our mic tracks (senders)
      pcRef.current.getSenders().forEach((s) => {
        if (s.track) {
          s.track.enabled = false;
          s.track.stop();
        }
      });
      // Stop bloom's audio tracks (receivers)
      pcRef.current.getReceivers().forEach((r) => {
        if (r.track) {
          r.track.enabled = false;
          r.track.stop();
        }
      });
      pcRef.current.ontrack = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.onconnectionstatechange = null;
      pcRef.current.close();
      pcRef.current = null;
    }

    // 6. Kill audio element completely
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.srcObject = null;
      audioRef.current.remove(); // Remove from DOM
      audioRef.current = null;
    }

    setStatus("idle");
  }, []);

  const connect = useCallback(async () => {
    // Prevent double-connect
    if (!disconnectedRef.current && pcRef.current) return;

    setError(null);
    setStatus("connecting");
    setElapsedSeconds(0);
    transcriptRef.current = [];
    setTranscript([]);
    currentBloomText.current = "";
    lastStudentRef.current = null;
    responseActiveRef.current = false;
    disconnectedRef.current = false;

    try {
      // ── 1. Get ephemeral token + reference context ──
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

      const tokenData = await tokenRes.json();
      const clientSecret = tokenData.clientSecret;

      if (!clientSecret) {
        throw new Error("No client secret returned");
      }

      if (disconnectedRef.current) return;

      // ── 2. Get microphone ──
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeStreams.add(stream);
      streamRef.current = stream;

      if (disconnectedRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        return;
      }

      // ── 3. Create peer connection ──
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // ── 4. Setup remote audio playback ──
      // Append to DOM body (hidden) for reliable playback in all browsers
      const audio = document.createElement("audio");
      audio.autoplay = true;
      audio.style.display = "none";
      document.body.appendChild(audio);
      audioRef.current = audio;

      pc.ontrack = (event) => {
        audio.srcObject = event.streams[0];
        audio.play().catch(() => {});
      };

      // ── 5. Add mic track ──
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      // ── 6. Create data channel ──
      const dc = pc.createDataChannel("oai-events");
      dcRef.current = dc;

      dc.onopen = () => {
        // Reinforce VAD + transcription config via session.update.
        // Uses nested format (required when type: "realtime" is present).
        dc.send(
          JSON.stringify({
            type: "session.update",
            session: {
              type: "realtime",
              audio: {
                input: {
                  transcription: {
                    model: "gpt-4o-transcribe",
                    language: "en",
                  },
                  turn_detection: {
                    type: "server_vad",
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 800,
                    create_response: false,
                    interrupt_response: true,
                  },
                },
              },
            },
          })
        );

        setStatus("listening");

        timerRef.current = setInterval(() => {
          setElapsedSeconds((s) => s + 1);
        }, 1000);
      };

      dc.onmessage = (event: MessageEvent) => {
        // Guard: ignore events after disconnect
        if (disconnectedRef.current) return;

        try {
          const msg = JSON.parse(event.data);
          const requestResponseOnce = (reason: string) => {
            const now = Date.now();
            if (responseActiveRef.current || responseRequestedRef.current) return;
            if (now - lastResponseAtRef.current < 1500) return;
            if (dcRef.current && dcRef.current.readyState === "open") {
              responseRequestedRef.current = true;
              lastResponseAtRef.current = now;
              dcRef.current.send(
                JSON.stringify({
                  type: "response.create",
                })
              );
              setStatus("thinking");
              if (responseRequestTimeoutRef.current) {
                clearTimeout(responseRequestTimeoutRef.current);
              }
              responseRequestTimeoutRef.current = setTimeout(() => {
                if (!responseActiveRef.current) {
                  responseRequestedRef.current = false;
                }
              }, 4000);
            }
          };

          switch (msg.type) {
            // ── VAD events ──
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
                const now = Date.now();
                const lastTranscriptAt = lastTranscriptAtRef.current || 0;
                if (now - lastTranscriptAt > 2000) {
                  requestResponseOnce("vad_stopped_fallback");
                }
              }, 1200);
              break;

            // ── Bloom response transcript ──
            case "response.output_audio_transcript.delta":
              currentBloomText.current += msg.delta || "";
              break;

            case "response.output_audio_transcript.done": {
              const text = msg.transcript || currentBloomText.current;
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

            // ── Student input transcription ──
            case "conversation.item.input_audio_transcription.completed": {
              const userText = msg.transcript;
              if (!userText?.trim()) break;

              const normalized = userText
                .trim()
                .toLowerCase()
                .replace(/\s+/g, " ");
              const now = Date.now();
              const last = lastStudentRef.current;
              lastTranscriptAtRef.current = now;

              // Fuzzy dedup: skip if >80% similar to last message within 8s
              let isDuplicate = false;
              if (last && now - last.at < 8000) {
                const shorter = Math.min(last.text.length, normalized.length);
                const longer = Math.max(last.text.length, normalized.length);
                if (shorter > 0 && longer > 0) {
                  const ratio = shorter / longer;
                  const prefixLen = Math.min(30, shorter);
                  const prefixMatch =
                    last.text.slice(0, prefixLen) ===
                    normalized.slice(0, prefixLen);
                  isDuplicate = ratio > 0.8 && prefixMatch;
                }
              }

              if (!isDuplicate) {
                transcriptRef.current.push({
                  role: "student",
                  content: userText.trim(),
                  timestamp: now,
                });
                setTranscript([...transcriptRef.current]);
                lastStudentRef.current = { text: normalized, at: now };
              }

              // Check for "bye" / "goodbye" to end session
              if (/\b(bye|goodbye)\b/i.test(normalized) && onByeRef.current) {
                const wordCount = normalized.split(" ").filter(Boolean).length;
                const isByeOnly = /^(bye|goodbye)$/.test(normalized);
                const isByeAtEnd = /(bye|goodbye)$/.test(normalized);
                if (isByeOnly || (isByeAtEnd && wordCount <= 4)) {
                  setTimeout(() => onByeRef.current?.(), 500);
                }
              }

              if (responseTimerRef.current) {
                clearTimeout(responseTimerRef.current);
                responseTimerRef.current = null;
              }
              requestResponseOnce("transcript_completed");
              break;
            }

            // ── Response lifecycle ──
            case "response.created":
              responseActiveRef.current = true;
              responseRequestedRef.current = false;
              if (responseRequestTimeoutRef.current) {
                clearTimeout(responseRequestTimeoutRef.current);
                responseRequestTimeoutRef.current = null;
              }
              setStatus("speaking");
              break;

            case "response.done":
              responseActiveRef.current = false;
              setStatus("listening");
              lastResponseAtRef.current = Date.now();
              break;

            // ── Errors ──
            case "error":
              if (msg.error?.message?.includes("cancellation")) break;
              if (msg.error?.message?.includes("no active response")) break;
              if (msg.error?.message?.includes("active response")) break;
              responseRequestedRef.current = false;
              if (responseRequestTimeoutRef.current) {
                clearTimeout(responseRequestTimeoutRef.current);
                responseRequestTimeoutRef.current = null;
              }
              setError(msg.error?.message || "Realtime API error");
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

      // ── 7. SDP exchange — raw SDP with ephemeral token ──
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      // Wait for ICE candidates (with timeout)
      if (pc.iceGatheringState !== "complete") {
        await new Promise<void>((resolve) => {
          const timeout = setTimeout(resolve, 3000);
          const onGather = () => {
            if (pc.iceGatheringState === "complete") {
              clearTimeout(timeout);
              pc.removeEventListener("icegatheringstatechange", onGather);
              resolve();
            }
          };
          pc.addEventListener("icegatheringstatechange", onGather);
        });
      }

      if (disconnectedRef.current) return;

      const sdpRes = await fetch(
        "https://api.openai.com/v1/realtime/calls",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${clientSecret}`,
            "Content-Type": "application/sdp",
          },
          body: pc.localDescription?.sdp,
        }
      );

      if (!sdpRes.ok) {
        const errText = await sdpRes.text().catch(() => "");
        throw new Error(
          `SDP exchange failed (${sdpRes.status}). ${errText}`
        );
      }

      const answerSdp = await sdpRes.text();
      await pc.setRemoteDescription({ type: "answer", sdp: answerSdp });
    } catch (err) {
      if (!disconnectedRef.current) {
        const message =
          err instanceof Error ? err.message : "Failed to connect";
        setError(message);
        disconnect();
      }
    }
  }, [sessionId, disconnect]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { status, connect, disconnect, transcript, error, elapsedSeconds };
}
