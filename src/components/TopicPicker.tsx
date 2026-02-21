"use client";

import { useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Sparkles, Check, ArrowUpRight } from "lucide-react";

const PRIMARY_SUBJECTS = [
  "Biology",
  "Computer Science",
  "Math",
  "Physics",
  "Chemistry",
  "History",
];

const ADDITIONAL_SUBJECTS = [
  "Literature",
  "Economics",
  "Psychology",
  "Philosophy",
];

const ALL_SUBJECTS = [...PRIMARY_SUBJECTS, ...ADDITIONAL_SUBJECTS];

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
  const [showMoreSubjects, setShowMoreSubjects] = useState(false);

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (topic.trim()) {
      setStep("mode");
    }
  };

  const handleFileUpload = async (file: File) => {
    const readApiResponse = async (response: Response) => {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        return response.json();
      }

      const text = await response.text();
      if (text.includes("<!DOCTYPE html>")) {
        return {
          error: "Server returned an HTML error page",
        };
      }

      return {
        error: text.slice(0, 300) || "Server returned a non-JSON response.",
      };
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", file.name);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    const result = await readApiResponse(response);

    if (!response.ok) {
      throw new Error(
        (result as { error?: string })?.error || `Upload failed (${response.status})`,
      );
    }

    const documentId = result?.documentId;
    if (typeof documentId !== "string" || !documentId) {
      throw new Error("Upload succeeded but no documentId was returned.");
    }

    const ingestResponse = await fetch("/api/ingest", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ documentId }),
    });

    const ingestResult = await readApiResponse(ingestResponse);

    if (!ingestResponse.ok) {
      throw new Error(
        (ingestResult as { error?: string })?.error ||
          `Ingest failed (${ingestResponse.status})`,
      );
    }
  };

  const handlePickMode = (mode: TeachingMode) => {
    onStart(topic.trim(), mode, subject || undefined);
  };

  return (
    <div className="flex-1 flex items-center justify-center p-6 relative">
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{
          background: [
            "radial-gradient(600px at center, rgba(16,185,129,0.05) 0%, transparent 80%)",
            "radial-gradient(600px at center, rgba(16,185,129,0.08) 0%, transparent 80%)",
            "radial-gradient(600px at center, rgba(16,185,129,0.05) 0%, transparent 80%)"
          ]
        }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="max-w-lg w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 mb-4 overflow-hidden">
            <motion.span 
              className="text-2xl"
              animate={{
                skewX: [-6, 6, -6],
                y: [0, 1, -1, 0],
                translateY: [0, -3, 0, -3, 0]
              }}
              transition={{
                skewX: {
                  duration: 3,
                  delay: 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                y: {
                  duration: 3,
                  delay: 0.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                },
                translateY: {
                  duration: 4,
                  delay: 0.2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }
              }}
              style={{ transformOrigin: "center bottom", display: "inline-block" }}
            >
              {"\uD83C\uDF31"}
            </motion.span>
          </div>
          <h2 className="font-outfit text-2xl font-semibold text-foreground mb-2">
            What do you want to teach today?
          </h2>
          <p className="text-sm text-muted-foreground max-w-sm mx-auto">
            Pick a topic and explain it to bloom. The best way to learn is to
            teach.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative group">
            <motion.div 
              className="absolute inset-0 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 rounded-lg blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity duration-300"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity }}
            />
            <div className="relative flex items-center">
              <Input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., How DNA replication works..."
                className="h-12 pl-12 pr-4 ring-2 ring-transparent focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-background shadow-lg hover:shadow-emerald-500/10 transition-all duration-300"
                autoFocus
              />
              <Sparkles className="absolute left-4 w-5 h-5 text-emerald-600 pointer-events-none" />
            </div>
          </div>
          <p className="text-xs text-emerald-600/70 px-1">Press Enter to start teaching</p>

          <div>
            <label className="text-xs text-muted-foreground mb-2 block">
              Subject area (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {(showMoreSubjects ? ALL_SUBJECTS : PRIMARY_SUBJECTS).map((s) => (
                <motion.button
                  key={s}
                  type="button"
                  onClick={() => setSubject(subject === s ? "" : s)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all border flex items-center gap-1.5 ${
                    subject === s
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "bg-muted/20 text-muted-foreground border-transparent hover:bg-muted/30"
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {s}
                  {subject === s && <Check className="w-3.5 h-3.5" />}
                </motion.button>
              ))}
              {!showMoreSubjects && ADDITIONAL_SUBJECTS.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowMoreSubjects(true)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-transparent transition-all"
                >
                  +{ADDITIONAL_SUBJECTS.length} More
                </button>
              )}
              {showMoreSubjects && (
                <button
                  type="button"
                  onClick={() => setShowMoreSubjects(false)}
                  className="px-3 py-1.5 rounded-full text-xs font-medium text-emerald-600 hover:text-emerald-700 bg-emerald-500/10 hover:bg-emerald-500/20 border border-transparent transition-all"
                >
                  Show Less
                </button>
              )}
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
              className="w-full h-12 bg-gradient-to-b from-emerald-500 to-emerald-700 hover:from-emerald-600 hover:to-emerald-800 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
            >
              {loading ? "Starting session..." : "Start Teaching"}
              {!loading && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </motion.div>
        </form>

        <div className="mt-8">
          <p className="text-xs text-muted-foreground mb-3 text-center">
            Or try one of these
          </p>
          <div className="grid grid-cols-2 gap-3">
            {SUGGESTED_TOPICS.map((s) => (
              <motion.button
                key={s.topic}
                onClick={() => {
                  setTopic(s.topic);
                  setSubject(s.subject);
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
