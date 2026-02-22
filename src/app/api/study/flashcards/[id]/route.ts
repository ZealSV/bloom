import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await params;

  const { data: deck, error: deckError } = await supabase
    .from("flashcard_decks")
    .select("*")
    .eq("id", deckId)
    .single();

  if (deckError || !deck)
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });

  const { data: cards, error: cardsError } = await supabase
    .from("flashcards")
    .select("*")
    .eq("deck_id", deckId)
    .order("created_at", { ascending: true });

  if (cardsError)
    return NextResponse.json({ error: cardsError.message }, { status: 500 });

  return NextResponse.json({ deck, cards: cards || [] });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: deckId } = await params;

  const { error } = await supabase
    .from("flashcard_decks")
    .delete()
    .eq("id", deckId);

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true });
}
