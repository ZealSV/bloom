"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Upload from "@/components/Upload";
import { ArrowRight, Sparkles, ArrowUpRight, FileUp } from "lucide-react";

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim(), "chat");
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative">
      <motion.div
        className="max-w-2xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
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
            Pick a topic and explain it to bloom. The best way to learn is to
            teach.
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
                className="h-12 pl-12 pr-4 ring-2 ring-transparent focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background shadow-lg transition-all duration-300"
                autoFocus
              />
              <Sparkles className="absolute left-4 w-5 h-5 text-emerald-600 pointer-events-none" />
            </div>
          </div>

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
              {loading ? "Starting session..." : "Start Teaching"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
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

        <Upload open={isUploadOpen} onOpenChange={setIsUploadOpen} />

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
    </div>
  );
}
