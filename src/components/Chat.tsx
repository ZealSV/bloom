"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import ChatMessage from "./ChatMessage";
import type { Message, Concept } from "@/hooks/useSession";

interface ChatProps {
  topic: string;
  messages: Message[];
  concepts: Concept[];
  isStreaming: boolean;
  onSend: (message: string) => void;
}

export default function Chat({
  topic,
  messages,
  concepts,
  isStreaming,
  onSend,
}: ChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const overallMastery =
    concepts.length > 0
      ? Math.round(
          concepts.reduce((sum, c) => sum + c.mastery_score, 0) /
            concepts.length,
        )
      : 0;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  return (
    <div className="flex flex-col h-full">
      {/* Topic header */}
      <div className="px-4 py-3 border-b border-border bg-card/50 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm">🌱</span>
            <div>
              <h3 className="text-sm font-medium text-foreground">{topic}</h3>
              <p className="text-xs text-muted-foreground">
                Teaching session
                {messages.length > 0 &&
                  ` · ${Math.floor(messages.length / 2)} exchanges`}
              </p>
            </div>
          </div>
          {concepts.length > 0 && (
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
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <motion.div
            className="flex flex-col items-center justify-center h-full text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
              <span className="text-xl">🌱</span>
            </div>
            <p className="text-sm text-foreground mb-1">
              Hey! I&apos;m bloom, your curious student.
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Go ahead and start explaining{" "}
              <span className="text-primary">{topic}</span> to me. I&apos;ll ask
              questions as I try to understand!
            </p>
          </motion.div>
        )}

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

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="p-3 border-t border-border shrink-0"
      >
        <div className="flex gap-2 items-end">
          <div className="flex-1">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Explain something to bloom..."
              className="w-full px-4 py-2.5 rounded-xl bg-card border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/30 focus:ring-1 focus:ring-primary/20 resize-none transition-all"
              rows={1}
              disabled={isStreaming}
              style={{ minHeight: "42px", maxHeight: "120px" }}
              onInput={(e) => {
                const target = e.target as HTMLTextAreaElement;
                target.style.height = "auto";
                target.style.height = Math.min(target.scrollHeight, 120) + "px";
              }}
            />
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-[42px] w-[42px] rounded-xl shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
