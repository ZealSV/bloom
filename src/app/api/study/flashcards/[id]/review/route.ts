import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await params;
  const { cardId, correct } = await req.json();

  if (!cardId)
    return NextResponse.json({ error: "cardId is required" }, { status: 400 });

  // Verify deck ownership
  const { data: deck } = await supabase
    .from("flashcard_decks")
    .select("user_id")
    .eq("id", deckId)
    .single();

  if (!deck || deck.user_id !== user.id)
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

  // Get current card stats
  const { data: card, error: fetchError } = await supabase
    .from("flashcards")
    .select("times_reviewed, times_correct, deck_id")
    .eq("id", cardId)
    .eq("deck_id", deckId)
    .single();

  if (fetchError || !card)
    return NextResponse.json({ error: "Card not found" }, { status: 404 });

  const timesReviewed = card.times_reviewed + 1;
  const timesCorrect = correct ? card.times_correct + 1 : card.times_correct;

  // Spaced repetition: correct → 2^timesCorrect days (max 30), incorrect → 1 day
  const daysUntilNext = correct
    ? Math.min(Math.pow(2, timesCorrect), 30)
    : 1;
  const nextReview = new Date();
  nextReview.setDate(nextReview.getDate() + daysUntilNext);

  const { error: updateError } = await supabase
    .from("flashcards")
    .update({
      times_reviewed: timesReviewed,
      times_correct: timesCorrect,
      next_review_at: nextReview.toISOString(),
    })
    .eq("id", cardId);

  if (updateError)
    return NextResponse.json({ error: updateError.message }, { status: 500 });

  return NextResponse.json({
    times_reviewed: timesReviewed,
    times_correct: timesCorrect,
    next_review_at: nextReview.toISOString(),
  });
}
