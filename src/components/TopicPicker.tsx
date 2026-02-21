"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight } from "lucide-react";

const SUBJECTS = [
  "Biology",
  "Computer Science",
  "Math",
  "Physics",
  "Chemistry",
  "History",
  "Literature",
  "Economics",
  "Psychology",
  "Philosophy",
];

const SUGGESTED_TOPICS = [
  { topic: "How photosynthesis works", subject: "Biology" },
  { topic: "What is recursion", subject: "Computer Science" },
  { topic: "The Pythagorean theorem", subject: "Math" },
  { topic: "How gravity works", subject: "Physics" },
  { topic: "The French Revolution", subject: "History" },
  { topic: "Supply and demand", subject: "Economics" },
];

interface TopicPickerProps {
  onStart: (topic: string, subjectArea?: string) => void;
  loading?: boolean;
}

export default function TopicPicker({ onStart, loading }: TopicPickerProps) {
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      onStart(topic.trim(), subject || undefined);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6">
      <motion.div
        className="max-w-lg w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-8">
          <motion.div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <span className="text-2xl">🌱</span>
          </motion.div>
          <h2 className="font-outfit text-2xl font-semibold text-foreground mb-2">
            What do you want to teach today?
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Pick a topic and explain it to bloom. The best way to learn is to
            teach.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., How DNA replication works..."
            className="h-11"
            autoFocus
          />

          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              Subject area (optional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SUBJECTS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSubject(subject === s ? "" : s)}
                  className={`px-2.5 py-1 rounded-full text-xs transition-all border ${
                    subject === s
                      ? "bg-primary/15 text-primary border-primary/30"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/20 hover:text-foreground"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={!topic.trim() || loading}
            className="w-full h-11"
          >
            {loading ? "Starting session..." : "Start Teaching"}
            {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
          </Button>
        </form>

        <div className="mt-8">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Or try one of these
          </p>
          <div className="grid grid-cols-2 gap-2">
            {SUGGESTED_TOPICS.map((s) => (
              <motion.button
                key={s.topic}
                onClick={() => {
                  setTopic(s.topic);
                  setSubject(s.subject);
                }}
                className="p-3 rounded-lg border border-border hover:border-primary/20 transition-all text-left group"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <p className="text-xs text-foreground/80 group-hover:text-foreground transition-colors">
                  {s.topic}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1">
                  {s.subject}
                </p>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
