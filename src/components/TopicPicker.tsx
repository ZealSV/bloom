"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Upload from "@/components/Upload";
import {
  ArrowRight,
  ArrowUpRight,
  ChevronLeft,
  FileUp,
  FileText,
  Flower,
  MessageSquare,
  Mic,
  X,
} from "lucide-react";

const SUGGESTED_TOPICS = [
  { topic: "How photosynthesis works", subject: "Biology" },
  { topic: "What is recursion", subject: "Computer Science" },
  { topic: "The Pythagorean theorem", subject: "Math" },
  { topic: "How gravity works", subject: "Physics" },
  { topic: "The French Revolution", subject: "History" },
  { topic: "Supply and demand", subject: "Economics" },
];

export type TeachingMode = "chat" | "speak";

interface TopicPickerProps {
  onStart: (topic: string, mode: TeachingMode) => void;
  loading?: boolean;
}

export default function TopicPicker({ onStart, loading }: TopicPickerProps) {
  const [topic, setTopic] = useState("");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [showModePicker, setShowModePicker] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      setShowModePicker(true);
    }
  };

  const handleSelectMode = (mode: TeachingMode) => {
    if (topic.trim()) {
      onStart(topic.trim(), mode);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative">
      <AnimatePresence mode="wait">
        {!showModePicker ? (
          <motion.div
            key="topic"
            className="max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.2 }}
              >
                <Image
                  src="/bloomlogo.png"
                  alt="bloom"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </motion.div>
              <h2 className="font-outfit text-3xl font-semibold text-foreground mb-2">
                What do you want to teach today?
              </h2>
              <p className="text-base text-muted-foreground max-w-md mx-auto">
                Pick a topic and explain it to bloom. The best way to learn is
                to teach.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative group">
                <div className="relative flex items-center">
                  <Input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., How DNA replication works..."
                    className="h-12 pl-12 pr-4 ring-2 ring-transparent focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                    autoFocus
                  />
                  <Flower className="absolute left-4 w-5 h-5 text-emerald-600 pointer-events-none" />
                </div>
              </div>

              {uploadedFileName && (
                <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2">
                  <div className="min-w-0 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-emerald-600 shrink-0" />
                    <p className="text-xs text-foreground truncate">
                      &apos;{uploadedFileName}&apos; has been uploaded!
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setUploadedFileName(null)}
                    className="h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground"
                    title="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}

              <motion.div
                whileHover={{ y: -2 }}
                whileTap={{ y: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                <Button
                  type="submit"
                  disabled={!topic.trim() || loading}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
                >
                  Start Teaching
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            </form>

            <div className="flex items-center justify-center mt-3">
              <button
                type="button"
                disabled={loading}
                onClick={() => setIsUploadOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <FileUp className="h-3.5 w-3.5" />
                or upload a file
              </button>
            </div>

            <Upload
              open={isUploadOpen}
              onOpenChange={setIsUploadOpen}
              onUploadComplete={setUploadedFileName}
            />

            <div className="mt-8">
              <p className="text-xs text-muted-foreground mb-3 text-center">
                Or try one of these
              </p>
              <div className="grid grid-cols-3 gap-3">
                {SUGGESTED_TOPICS.map((s) => (
                  <motion.button
                    key={s.topic}
                    onClick={() => {
                      setTopic(s.topic);
                    }}
                    className="p-4 rounded-lg transition-all text-left group relative border border-border/40 bg-muted/10 hover:bg-muted/20 hover:border-emerald-500/30"
                    whileHover={{ y: -2 }}
                    whileTap={{ y: 0 }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-emerald-600 transition-colors">
                          {s.topic}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {s.subject}
                        </p>
                      </div>
                      <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                      >
                        <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/10 group-hover:bg-emerald-500/20">
                          <ArrowUpRight className="w-3 h-3 text-emerald-600" />
                        </span>
                      </motion.div>
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="mode"
            className="max-w-md w-full"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            {/* Topic pill */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.1,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <button
                type="button"
                onClick={() => setShowModePicker(false)}
                className="group inline-flex items-center gap-2 rounded-full border border-border bg-card/80 backdrop-blur-sm pl-3 pr-4 py-2 transition-all hover:border-primary/30 hover:bg-card"
              >
                <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                <Flower className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-sm text-foreground font-medium truncate max-w-[260px]">
                  {topic}
                </span>
              </button>
            </motion.div>
            {/* Heading */}
            <motion.div
              className="text-center mb-8"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.15,
                duration: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <h2 className="font-outfit text-2xl font-semibold text-foreground">
                Choose how you want to teach bloom
              </h2>
            </motion.div>
            {/* Mode cards */}
            <div className="space-y-3">
              <motion.button
                onClick={() => handleSelectMode("chat")}
                disabled={loading}
                className="group relative w-full rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:border-emerald-500/30 disabled:opacity-50 overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{
                  delay: 0.2,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-emerald-500/10 border border-emerald-500/15 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/15 group-hover:border-emerald-500/25 transition-all duration-300">
                    <MessageSquare className="h-[18px] w-[18px] text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-outfit font-semibold text-[15px] text-foreground">
                      {loading ? "Starting..." : "Text Chat"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Type your explanations and get written feedback
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                </div>
              </motion.button>

              <motion.button
                onClick={() => handleSelectMode("speak")}
                disabled={loading}
                className="group relative w-full rounded-2xl border border-border/60 bg-card p-5 text-left transition-all hover:border-primary/30 disabled:opacity-50 overflow-hidden"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                transition={{
                  delay: 0.28,
                  duration: 0.4,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center gap-4">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/15 flex items-center justify-center shrink-0 group-hover:bg-primary/15 group-hover:border-primary/25 transition-all duration-300">
                    <Mic className="h-[18px] w-[18px] text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-outfit font-semibold text-[15px] text-foreground">
                      {loading ? "Starting..." : "Live Voice"}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Speak out loud and have a real-time conversation
                    </p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-300 shrink-0" />
                </div>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
