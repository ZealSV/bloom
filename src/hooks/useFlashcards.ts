"use client";

import { useState, useCallback } from "react";
import type { FlashcardDeck, Flashcard } from "@/types/study";

export function useFlashcards() {
  const [decks, setDecks] = useState<FlashcardDeck[]>([]);
  const [currentDeck, setCurrentDeck] = useState<FlashcardDeck | null>(null);
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchDecks = useCallback(async (subjectId?: string) => {
    setLoading(true);
    try {
      const url = subjectId
        ? `/api/study/flashcards?subject_id=${subjectId}`
        : "/api/study/flashcards";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setDecks(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchDeck = useCallback(async (deckId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/study/flashcards/${deckId}`);
      if (res.ok) {
        const data = await res.json();
        setCurrentDeck(data.deck);
        setCards(data.cards);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteDeck = useCallback(
    async (deckId: string) => {
      const res = await fetch(`/api/study/flashcards/${deckId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setDecks((prev) => prev.filter((d) => d.id !== deckId));
        if (currentDeck?.id === deckId) {
          setCurrentDeck(null);
          setCards([]);
        }
      }
    },
    [currentDeck]
  );

  const reviewCard = useCallback(
    async (cardId: string, correct: boolean) => {
      if (!currentDeck) return;
      const res = await fetch(
        `/api/study/flashcards/${currentDeck.id}/review`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId, correct }),
        }
      );
      if (res.ok) {
        const updated = await res.json();
        setCards((prev) =>
          prev.map((c) =>
            c.id === cardId
              ? {
                  ...c,
                  times_reviewed: updated.times_reviewed,
                  times_correct: updated.times_correct,
                  next_review_at: updated.next_review_at,
                }
              : c
          )
        );
      }
    },
    [currentDeck]
  );

  return {
    decks,
    currentDeck,
    cards,
    loading,
    fetchDecks,
    fetchDeck,
    deleteDeck,
    reviewCard,
  };
}
