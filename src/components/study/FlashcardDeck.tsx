"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  RotateCcw,
  BookOpen,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FlashcardDeck as DeckType, Flashcard } from "@/types/study";

interface FlashcardDeckProps {
  deck: DeckType;
  cards: Flashcard[];
  onReview: (cardId: string, correct: boolean) => void;
  onBack: () => void;
}

export default function FlashcardDeck({
  deck,
  cards,
  onReview,
  onBack,
}: FlashcardDeckProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Map<string, boolean>>(new Map());

  const card = cards[currentIndex];
  const total = cards.length;
  const reviewed = results.size;
  const correct = Array.from(results.values()).filter(Boolean).length;

  const isComplete = reviewed === total;

  const handleAnswer = (isCorrect: boolean) => {
    if (!card) return;
    onReview(card.id, isCorrect);
    setResults((prev) => new Map(prev).set(card.id, isCorrect));
    setFlipped(false);

    if (currentIndex < total - 1) {
      setTimeout(() => setCurrentIndex((i) => i + 1), 300);
    }
  };

  const restart = () => {
    setCurrentIndex(0);
    setFlipped(false);
    setResults(new Map());
  };

  if (!card) return null;

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
              {deck.title}
            </h2>
            <p className="text-xs text-muted-foreground">
              {reviewed}/{total} reviewed &middot; {correct} correct
            </p>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-primary"
          animate={{ width: `${(reviewed / total) * 100}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {isComplete ? (
        /* Results */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl border border-border bg-card p-8 text-center"
        >
          <BookOpen className="h-10 w-10 text-primary mx-auto mb-3" />
          <h3 className="font-outfit text-xl font-semibold text-foreground mb-1">
            Deck Complete!
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            You got {correct} out of {total} correct (
            {Math.round((correct / total) * 100)}%)
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" onClick={onBack}>
              Back to Decks
            </Button>
            <Button onClick={restart}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Study Again
            </Button>
          </div>
        </motion.div>
      ) : (
        /* Card */
        <div className="flex flex-col items-center gap-4">
          <div
            className="w-full max-w-lg cursor-pointer"
            style={{ perspective: 1000 }}
            onClick={() => setFlipped(!flipped)}
          >
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentIndex}-${flipped}`}
                initial={{ rotateY: flipped ? -90 : 90, opacity: 0 }}
                animate={{ rotateY: 0, opacity: 1 }}
                exit={{ rotateY: flipped ? 90 : -90, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded-2xl border border-border bg-card min-h-[240px] flex flex-col items-center justify-center p-8"
                style={{ transformStyle: "preserve-3d" }}
              >
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground mb-3">
                  {flipped ? "Answer" : "Question"}
                </span>
                <p className="text-center text-foreground text-lg leading-relaxed">
                  {flipped ? card.back : card.front}
                </p>
                {!flipped && (
                  <p className="text-[10px] text-muted-foreground mt-4">
                    Click to reveal answer
                  </p>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Answer buttons (shown when flipped) */}
          {flipped && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3"
            >
              <Button
                variant="outline"
                onClick={() => handleAnswer(false)}
                className="text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <X className="mr-1.5 h-4 w-4" />
                Still Learning
              </Button>
              <Button onClick={() => handleAnswer(true)}>
                <Check className="mr-1.5 h-4 w-4" />
                I Knew This
              </Button>
            </motion.div>
          )}

          {/* Navigation */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => {
                setFlipped(false);
                setCurrentIndex((i) => i - 1);
              }}
              className="h-7 w-7 p-0"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Button>
            <span>
              {currentIndex + 1} / {total}
            </span>
            <Button
              variant="ghost"
              size="sm"
              disabled={currentIndex === total - 1}
              onClick={() => {
                setFlipped(false);
                setCurrentIndex((i) => i + 1);
              }}
              className="h-7 w-7 p-0"
            >
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
