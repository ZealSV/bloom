"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import type { Message, Concept } from "@/hooks/useSession";

interface ChatProps {
  topic: string;
  messages: Message[];
  concepts: Concept[];
  sessionMastery?: number;
  isStreaming: boolean;
  onSend: (message: string) => void;
  voiceMode?: boolean;
  onVoiceModeChange?: (enabled: boolean) => void;
  ttsEnabled?: boolean;
  onTtsEnabledChange?: (enabled: boolean) => void;
  isSpeaking?: boolean;
  onStopSpeaking?: () => void;
}

export default function Chat({
  topic,
  messages,
  concepts,
  sessionMastery = 0,
  isStreaming,
  onSend,
  voiceMode = false,
  onVoiceModeChange,
  ttsEnabled = true,
  onTtsEnabledChange,
  isSpeaking = false,
  onStopSpeaking,
}: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const overallMastery = sessionMastery > 0
    ? Math.round(sessionMastery)
    : concepts.length > 0
      ? Math.round(
        concepts.reduce((sum, c) => sum + c.mastery_score, 0) /
        concepts.length,
      )
      : 0;

  const handleFinalTranscript = useCallback(
    (transcript: string) => {
      if (voiceMode && transcript.trim()) {
        onSend(transcript.trim());
        setInput("");
      }
    },
    [voiceMode, onSend]
  );

  const {
    isListening,
    isSupported,
    startListening,
    stopListening,
  } = useSpeechRecognition({
    onTranscript: (transcript) => setInput(transcript),
    onFinalTranscript: handleFinalTranscript,
  });

  const handleStartListening = useCallback(() => {
    onStopSpeaking?.();
    startListening();
  }, [onStopSpeaking, startListening]);

  const handleToggleTts = useCallback(() => {
    if (ttsEnabled) {
      onStopSpeaking?.();
    }
    onTtsEnabledChange?.(!ttsEnabled);
  }, [ttsEnabled, onStopSpeaking, onTtsEnabledChange]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (ttsEnabled && !isSpeaking && !isStreaming) {
      inputRef.current?.focus();
    }
  }, [ttsEnabled, isSpeaking, isStreaming]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isStreaming) {
      onSend(input);
      setInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const hasMessages = messages.length > 0;

  /* Shared input bar */
  const inputBar = (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="max-w-3xl mx-auto">
        <div className="rounded-2xl border border-border bg-card p-1.5 flex items-center gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`Explain ${topic.toLowerCase()} to bloom...`}
            className="flex-1 px-3 py-2 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none resize-none"
            rows={1}
            disabled={isStreaming}
            style={{ minHeight: "36px", maxHeight: "120px" }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = "auto";
              target.style.height = Math.min(target.scrollHeight, 120) + "px";
            }}
          />

          {voiceMode && (
            <Button
              type="button"
              size="icon"
              variant="ghost"
              onClick={isListening ? stopListening : handleStartListening}
              disabled={isStreaming || !isSupported}
              className={`h-9 w-9 rounded-xl shrink-0 relative ${isListening
                ? "bg-red-500 hover:bg-red-600 text-white"
                : "text-muted-foreground hover:text-foreground"
                }`}
              title={
                !isSupported
                  ? "Speech recognition not supported in this browser"
                  : isListening
                    ? "Stop listening"
                    : "Start speaking"
              }
            >
              {isListening ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
              {isListening && (
                <motion.div
                  className="absolute inset-0 rounded-xl border-2 border-red-400"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}
            </Button>
          )}

          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </form>
  );

  /* ── Empty state: everything centered ── */
  if (!hasMessages) {
    return (
      <div className="flex flex-col h-full">
        {/* Minimal header */}
        <div className="px-4 py-3 flex items-center justify-end shrink-0">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Mic
              </span>
              <button
                onClick={() => onVoiceModeChange?.(!voiceMode)}
                className={`p-1.5 rounded-lg transition-colors ${voiceMode
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title={voiceMode ? "Mic on" : "Mic off"}
              >
                {voiceMode ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                TTS
              </span>
              <button
                onClick={handleToggleTts}
                className={`p-1.5 rounded-lg transition-colors ${ttsEnabled
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title={ttsEnabled ? "TTS on" : "TTS off"}
              >
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Centered content — shifted up with pb-28 */}
        <div className="flex-1 flex flex-col items-center justify-center px-4 pb-28">
          <motion.div
            className="flex flex-col items-center text-center mb-10"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5">
              <Image src="/bloomlogo.png" alt="bloom" width={32} height={32} className="rounded-lg" />
            </div>
            <p className="text-2xl font-semibold text-foreground mb-2">
              Teach me about <span className="text-primary">&ldquo;{topic}&rdquo;</span>
            </p>
            <p className="text-base text-muted-foreground max-w-md leading-relaxed">
              I&apos;m bloom, your curious student. Start explaining and I&apos;ll
              ask questions as I try to understand!
            </p>
          </motion.div>

          <motion.div
            className="w-full max-w-xl"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            {inputBar}
          </motion.div>
        </div>
      </div>
    );
  }

  /* ── With messages: standard chat layout ── */
  return (
    <div className="flex flex-col h-full">
      {/* Topic header */}
      <div className="px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/bloomlogo.png" alt="bloom" width={16} height={16} className="rounded-sm" />
            <div>
              <h3 className="text-sm font-medium text-foreground">{topic}</h3>
              <p className="text-xs text-muted-foreground">
                {Math.floor(messages.length / 2)} exchanges
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${overallMastery}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                {overallMastery}%
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Mic
              </span>
              <button
                onClick={() => onVoiceModeChange?.(!voiceMode)}
                className={`p-1.5 rounded-lg transition-colors ${voiceMode
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title={voiceMode ? "Mic on" : "Mic off"}
              >
                {voiceMode ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
              </button>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                TTS
              </span>
              <button
                onClick={handleToggleTts}
                className={`p-1.5 rounded-lg transition-colors ${ttsEnabled
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                title={ttsEnabled ? "TTS on" : "TTS off"}
              >
                {ttsEnabled ? (
                  <Volume2 className="h-4 w-4" />
                ) : (
                  <VolumeX className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">
          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <ChatMessage
                key={`${msg.role}-${i}`}
                role={msg.role}
                content={msg.content}
                isStreaming={msg.isStreaming}
              />
            ))}
          </AnimatePresence>

          {isStreaming && messages[messages.length - 1]?.content === "" && (
            <motion.div
              className="flex items-center gap-2 text-xs text-muted-foreground pl-11"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div
                className="flex gap-1"
                animate={{ opacity: [0.5, 1, 0.5] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
                <span className="w-1.5 h-1.5 bg-primary/40 rounded-full" />
              </motion.div>
              <span>bloom is thinking...</span>
            </motion.div>
          )}

          {ttsEnabled && isSpeaking && (
            <motion.div
              className="flex items-center gap-2 text-xs text-primary pl-11"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <motion.div className="flex items-center gap-0.5">
                {[0, 1, 2, 3].map((i) => (
                  <motion.span
                    key={i}
                    className="w-1 bg-primary rounded-full"
                    animate={{ height: ["4px", "12px", "4px"] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                    }}
                  />
                ))}
              </motion.div>
              <span>bloom is speaking...</span>
              <button
                onClick={onStopSpeaking}
                className="ml-1 text-muted-foreground hover:text-foreground transition-colors"
              >
                <VolumeX className="h-3 w-3" />
              </button>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input pinned to bottom */}
      <div className="shrink-0 border-t border-border bg-background px-4 py-3">
        {inputBar}
      </div>
    </div>
  );
}
