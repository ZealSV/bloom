"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Send,
  Loader2,
  Trophy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { PracticeExam, ExamQuestion } from "@/types/study";

interface ExamResult {
  questionIndex: number;
  correct: boolean;
  studentAnswer: string;
  correctAnswer: string;
  feedback: string;
}

interface ExamViewProps {
  exam: PracticeExam;
  onSubmit: (answers: Record<number, string>) => Promise<{
    score: number;
    results: ExamResult[];
    totalCorrect: number;
    total: number;
  } | null>;
  onBack: () => void;
}

export default function ExamView({ exam, onSubmit, onBack }: ExamViewProps) {
  const questions = exam.questions as ExamQuestion[];
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<{
    score: number;
    results: ExamResult[];
    totalCorrect: number;
    total: number;
  } | null>(null);

  const question = questions[currentQ];
  const answered = Object.keys(answers).length;
  const reviewing = results !== null;

  const setAnswer = (index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const data = await onSubmit(answers);
    if (data) setResults(data);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="h-8 w-8 p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="font-outfit text-lg font-semibold text-foreground">
              {exam.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {questions.length} questions &middot;{" "}
              {reviewing
                ? `Score: ${results.score}%`
                : `${answered}/${questions.length} answered`}
            </p>
          </div>
        </div>
        {!reviewing && (
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={submitting || answered === 0}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Grading...
              </>
            ) : (
              <>
                <Send className="mr-1.5 h-3.5 w-3.5" />
                Submit
              </>
            )}
          </Button>
        )}
      </div>

      {/* Progress dots */}
      <div className="flex items-center gap-1 flex-wrap">
        {questions.map((_, i) => {
          const result = results?.results.find((r) => r.questionIndex === i);
          const isAnswered = answers[i] !== undefined;
          return (
            <button
              key={i}
              onClick={() => setCurrentQ(i)}
              className={`h-2 w-2 rounded-full transition-colors ${
                i === currentQ
                  ? "ring-2 ring-primary ring-offset-1 ring-offset-background"
                  : ""
              } ${
                result
                  ? result.correct
                    ? "bg-green-500"
                    : "bg-destructive"
                  : isAnswered
                    ? "bg-primary"
                    : "bg-muted"
              }`}
            />
          );
        })}
      </div>

      {/* Score banner */}
      {reviewing && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-border bg-card p-4 flex items-center gap-4"
        >
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Trophy className="h-6 w-6 text-primary" />
          </div>
          <div>
            <p className="font-outfit text-2xl font-bold text-foreground">
              {results.score}%
            </p>
            <p className="text-xs text-muted-foreground">
              {results.totalCorrect} of {results.total} correct
            </p>
          </div>
        </motion.div>
      )}

      {/* Question */}
      {question && (
        <motion.div
          key={currentQ}
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          className="rounded-2xl border border-border bg-card p-6"
        >
          <div className="flex items-start gap-3 mb-4">
            <span className="shrink-0 h-6 w-6 rounded-full bg-muted flex items-center justify-center text-xs font-medium text-muted-foreground">
              {currentQ + 1}
            </span>
            <div className="flex-1">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                {question.type === "multiple_choice"
                  ? "Multiple Choice"
                  : question.type === "true_false"
                    ? "True / False"
                    : "Short Answer"}
              </span>
              <p className="text-sm text-foreground mt-1 leading-relaxed">
                {question.question}
              </p>
            </div>
          </div>

          {/* Answer options */}
          <div className="space-y-2 ml-9">
            {question.type === "multiple_choice" && question.options && (
              <>
                {question.options.map((option, oi) => {
                  const letter = String.fromCharCode(65 + oi);
                  const isSelected = answers[currentQ] === letter;
                  const result = results?.results.find(
                    (r) => r.questionIndex === currentQ
                  );
                  const isCorrectOption =
                    result && result.correctAnswer === letter;
                  const isWrongSelected =
                    result && isSelected && !result.correct;

                  return (
                    <button
                      key={oi}
                      onClick={() => !reviewing && setAnswer(currentQ, letter)}
                      disabled={reviewing}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-sm transition-colors ${
                        isCorrectOption && reviewing
                          ? "border-green-500 bg-green-500/10 text-foreground"
                          : isWrongSelected
                            ? "border-destructive bg-destructive/10 text-foreground"
                            : isSelected
                              ? "border-primary bg-primary/10 text-foreground"
                              : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      <span
                        className={`shrink-0 h-5 w-5 rounded-full border flex items-center justify-center text-[10px] font-medium ${
                          isCorrectOption && reviewing
                            ? "border-green-500 text-green-500"
                            : isWrongSelected
                              ? "border-destructive text-destructive"
                              : isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border text-muted-foreground"
                        }`}
                      >
                        {isCorrectOption && reviewing ? (
                          <Check className="h-3 w-3" />
                        ) : isWrongSelected ? (
                          <X className="h-3 w-3" />
                        ) : (
                          letter
                        )}
                      </span>
                      {option}
                    </button>
                  );
                })}
              </>
            )}

            {question.type === "true_false" && (
              <div className="flex gap-2">
                {["True", "False"].map((tf) => {
                  const isSelected = answers[currentQ] === tf;
                  const result = results?.results.find(
                    (r) => r.questionIndex === currentQ
                  );
                  const isCorrectOption =
                    result && result.correctAnswer === tf;
                  const isWrongSelected =
                    result && isSelected && !result.correct;

                  return (
                    <button
                      key={tf}
                      onClick={() => !reviewing && setAnswer(currentQ, tf)}
                      disabled={reviewing}
                      className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        isCorrectOption && reviewing
                          ? "border-green-500 bg-green-500/10 text-green-600"
                          : isWrongSelected
                            ? "border-destructive bg-destructive/10 text-destructive"
                            : isSelected
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border hover:bg-muted/50 text-foreground"
                      }`}
                    >
                      {tf}
                    </button>
                  );
                })}
              </div>
            )}

            {question.type === "short_answer" && (
              <Input
                placeholder="Type your answer..."
                value={answers[currentQ] || ""}
                onChange={(e) => setAnswer(currentQ, e.target.value)}
                disabled={reviewing}
                className="text-sm"
              />
            )}

            {/* Feedback */}
            {reviewing && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`mt-3 rounded-lg p-3 text-xs ${
                  results.results.find((r) => r.questionIndex === currentQ)
                    ?.correct
                    ? "bg-green-500/10 text-green-700 dark:text-green-400"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {results.results.find((r) => r.questionIndex === currentQ)
                  ?.feedback || "No feedback available"}
              </motion.div>
            )}
          </div>
        </motion.div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          disabled={currentQ === 0}
          onClick={() => setCurrentQ((i) => i - 1)}
        >
          <ArrowLeft className="mr-1 h-3.5 w-3.5" />
          Previous
        </Button>
        <span className="text-xs text-muted-foreground">
          {currentQ + 1} / {questions.length}
        </span>
        <Button
          variant="ghost"
          size="sm"
          disabled={currentQ === questions.length - 1}
          onClick={() => setCurrentQ((i) => i + 1)}
        >
          Next
          <ArrowRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
