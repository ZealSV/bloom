"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, MessageSquare, Radio, ArrowLeft, ChevronDown } from "lucide-react";

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
  onStart: (topic: string, mode: TeachingMode, subjectArea?: string) => void;
  loading?: boolean;
}

const PRIMARY_SUBJECTS = [...new Set(SUGGESTED_TOPICS.map((t) => t.subject))];
const EXTRA_SUBJECTS = [
  "Chemistry",
  "Literature",
  "Psychology",
  "Philosophy",
];

export default function TopicPicker({ onStart, loading }: TopicPickerProps) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");
  const [step, setStep] = useState<"topic" | "mode">("topic");
  const [showSubjects, setShowSubjects] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      setStep("mode");
    }
  };

  const handlePickMode = (mode: TeachingMode) => {
    onStart(topic.trim(), mode, subject || undefined);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <AnimatePresence mode="wait">
        {step === "topic" ? (
          <motion.div
            key="topic"
            className="max-w-2xl w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
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

            <LayoutGroup>
              <form onSubmit={handleContinue}>
                <motion.div layout="position" className="space-y-5">
                  <Input
                    type="text"
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g., How DNA replication works..."
                    className="h-12 text-base"
                    autoFocus
                  />

                  <div>
                    <label className="text-xs text-muted-foreground mb-2 block">
                      Subject area (optional)
                    </label>
                    <motion.div layout className="flex flex-wrap gap-2" transition={{ duration: 0.25, ease: "easeInOut" }}>
                      {PRIMARY_SUBJECTS.map((s) => (
                        <motion.button
                          layout
                          key={s}
                          type="button"
                          onClick={() => setSubject(subject === s ? "" : s)}
                          transition={{ duration: 0.25, ease: "easeInOut" }}
                          className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                            subject === s
                              ? "bg-primary/15 text-primary border-primary/30"
                              : "bg-transparent text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                          }`}
                        >
                          {s}
                        </motion.button>
                      ))}
                      <AnimatePresence>
                        {showSubjects &&
                          EXTRA_SUBJECTS.map((s) => (
                            <motion.button
                              layout
                              key={s}
                              type="button"
                              onClick={() => setSubject(subject === s ? "" : s)}
                              initial={{ opacity: 0, scale: 0.85 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.85 }}
                              transition={{ duration: 0.2 }}
                              className={`px-3 py-1.5 rounded-full text-xs transition-colors border ${
                                subject === s
                                  ? "bg-primary/15 text-primary border-primary/30"
                                  : "bg-transparent text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                              }`}
                            >
                              {s}
                            </motion.button>
                          ))}
                      </AnimatePresence>
                      <button
                        type="button"
                        onClick={() => setShowSubjects((v) => !v)}
                        className="px-1 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-0.5"
                      >
                        {showSubjects ? "less" : "more"}
                        <ChevronDown
                          className={`h-3 w-3 transition-transform duration-200 ${showSubjects ? "rotate-180" : ""}`}
                        />
                      </button>
                    </motion.div>
                  </div>

                  <motion.div layout transition={{ duration: 0.25, ease: "easeInOut" }}>
                    <Button
                      type="submit"
                      disabled={!topic.trim() || loading}
                      className="w-full h-12 text-base"
                    >
                      {loading ? "Starting session..." : "Start Teaching"}
                      {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
                    </Button>
                  </motion.div>
                </motion.div>
              </form>

              <motion.div layout transition={{ duration: 0.25, ease: "easeInOut" }} className="mt-10">
                <p className="text-xs text-muted-foreground mb-3 text-center">
                  Or try one of these
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {SUGGESTED_TOPICS.map((s) => (
                    <motion.button
                      key={s.topic}
                      onClick={() => {
                        setTopic(s.topic);
                        setSubject(s.subject);
                      }}
                      className="p-3 rounded-xl border border-border hover:border-primary/20 transition-all text-left group"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <p className="text-sm text-foreground/80 group-hover:text-foreground transition-colors">
                        {s.topic}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        {s.subject}
                      </p>
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            </LayoutGroup>
          </motion.div>
        ) : (
          <motion.div
            key="mode"
            className="max-w-md w-full"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <div className="text-center mb-8">
              <motion.div
                className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 mb-5"
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring" }}
              >
                <Image
                  src="/bloomlogo.png"
                  alt="bloom"
                  width={32}
                  height={32}
                  className="rounded-lg"
                />
              </motion.div>
              <h2 className="font-outfit text-2xl font-semibold text-foreground mb-2">
                How do you want to teach?
              </h2>
              <p className="text-sm text-muted-foreground">
                Teaching{" "}
                <span className="text-primary font-medium">&ldquo;{topic}&rdquo;</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <motion.button
                onClick={() => handlePickMode("chat")}
                disabled={loading}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">Chat</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Type your explanations
                  </p>
                </div>
              </motion.button>

              <motion.button
                onClick={() => handlePickMode("speak")}
                disabled={loading}
                className="flex flex-col items-center gap-3 p-6 rounded-2xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all disabled:opacity-50"
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Radio className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">Speak</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Talk live with bloom
                  </p>
                </div>
              </motion.button>
            </div>

            <button
              onClick={() => setStep("topic")}
              className="flex items-center gap-1.5 mx-auto mt-6 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
