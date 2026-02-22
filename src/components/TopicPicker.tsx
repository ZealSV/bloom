"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Upload from "@/components/Upload";
import {
  ArrowRight,
  ArrowUpRight,
  FileUp,
  FileText,
  Flower,
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

const BROAD_TOPICS = new Set([
  "biology",
  "computer science",
  "cs",
  "math",
  "mathematics",
  "physics",
  "chemistry",
  "history",
  "economics",
  "psychology",
  "philosophy",
  "engineering",
  "medicine",
  "law",
  "art",
  "music",
  "literature",
  "statistics",
  "data science",
  "ai",
  "artificial intelligence",
  "machine learning",
  "neuroscience",
  "political science",
  "sociology",
  "anthropology",
  "geography",
  "astronomy",
  "environmental science",
  "public health",
  "finance",
  "accounting",
  "business",
  "marketing",
  "design",
  "architecture",
  "mechanical engineering",
  "electrical engineering",
  "civil engineering",
  "software engineering",
  "robotics",
  "linguistics",
  "education",
]);

export type TeachingMode = "chat" | "speak";

interface TopicPickerProps {
  onStart: (topic: string, mode: TeachingMode) => void;
  loading?: boolean;
}

export default function TopicPicker({ onStart, loading }: TopicPickerProps) {
  const [topic, setTopic] = useState("");
  const [step, setStep] = useState<"topic" | "clarify">("topic");
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [subtopic, setSubtopic] = useState("");
  const [level, setLevel] = useState("");
  const [goal, setGoal] = useState("");
  const [classifying, setClassifying] = useState(false);

  const isBroadTopic = useMemo(() => {
    const trimmed = topic.trim().toLowerCase();
    if (!trimmed) return false;
    if (BROAD_TOPICS.has(trimmed)) return true;
    return false;
  }, [topic]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      if (isBroadTopic) {
        setStep("clarify");
        return;
      }

      try {
        setClassifying(true);
        const res = await fetch("/api/topics/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ topic: topic.trim() }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.broad) {
            setStep("clarify");
            return;
          }
        }
      } catch {
        // fall through to start teaching
      } finally {
        setClassifying(false);
      }

      onStart(topic.trim(), "chat");
    }
  };

  const handleClarifySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subtopic.trim()) return;

    const parts = [
      `${topic.trim()}: ${subtopic.trim()}`,
      level.trim() ? `level: ${level.trim()}` : "",
      goal.trim() ? `goal: ${goal.trim()}` : "",
    ].filter(Boolean);

    onStart(parts.join(" · "), "chat");
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
            {step === "clarify"
              ? "Let’s narrow that down"
              : "What do you want to teach today?"}
          </h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto">
            {step === "clarify"
              ? "That topic is broad. Pick a specific focus so bloom can learn with you."
              : "Pick a topic and explain it to bloom. The best way to learn is to teach."}
          </p>
        </div>

        {step === "topic" ? (
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
                    '{uploadedFileName}' has been uploaded!
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
              disabled={!topic.trim() || loading || classifying}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
            >
              {loading || classifying ? "Starting session..." : "Start Teaching"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
            </motion.div>
          </form>
        ) : (
          <form onSubmit={handleClarifySubmit} className="space-y-3">
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              Broad topic: <span className="text-foreground/80">{topic.trim()}</span>
            </div>

            <Input
              type="text"
              value={subtopic}
              onChange={(e) => setSubtopic(e.target.value)}
              placeholder="What specific subtopic? (e.g., natural selection)"
              className="h-12"
              autoFocus
            />
            <Input
              type="text"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="What level? (e.g., high school, college, beginner)"
              className="h-12"
            />
            <Input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="What’s your goal? (e.g., understand the process)"
              className="h-12"
            />

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                className="w-24"
                onClick={() => setStep("topic")}
              >
                Back
              </Button>
              <Button
                type="submit"
                disabled={!subtopic.trim() || loading}
                className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
              >
                {loading ? "Starting session..." : "Continue to Teaching"}
                {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </form>
        )}

        {step === "topic" && (
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
        )}

        <Upload
          open={isUploadOpen}
          onOpenChange={setIsUploadOpen}
          onUploadComplete={setUploadedFileName}
        />

        {step === "topic" && (
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
        )}
      </motion.div>
    </div>
  );
}
