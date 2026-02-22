import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { FLASHCARD_GENERATION_PROMPT } from "@/lib/study-prompts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceType = "all", sourceIds } = await req.json();

  // Aggregate knowledge context
  const ctxRes = await fetch(new URL("/api/study/context", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ sourceType, sourceIds }),
  });

  if (!ctxRes.ok) {
    return NextResponse.json(
      { error: "Failed to aggregate context" },
      { status: 500 }
    );
  }

  const { context } = await ctxRes.json();

  if (!context || context.length < 50) {
    return NextResponse.json(
      { error: "Not enough learning data to generate flashcards. Try adding lectures, documents, or chat sessions first." },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: FLASHCARD_GENERATION_PROMPT },
        {
          role: "user",
          content: `Here is the student's complete learning data:\n\n${context}\n\nGenerate flashcards based on this material.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3000,
    });

    const resultText = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(resultText);

    if (!result.cards || !Array.isArray(result.cards)) {
      return NextResponse.json(
        { error: "Failed to generate valid flashcards" },
        { status: 500 }
      );
    }

    // Create deck
    const { data: deck, error: deckError } = await supabase
      .from("flashcard_decks")
      .insert({
        user_id: user.id,
        title: result.title || "Study Deck",
        source_type: sourceType,
        source_ids: sourceIds || [],
        card_count: result.cards.length,
      })
      .select()
      .single();

    if (deckError || !deck) {
      return NextResponse.json(
        { error: "Failed to create deck" },
        { status: 500 }
      );
    }

    // Insert cards
    const cardRows = result.cards.map(
      (card: { front: string; back: string; difficulty?: string }) => ({
        deck_id: deck.id,
        front: card.front,
        back: card.back,
        difficulty: card.difficulty || "medium",
      })
    );

    const { error: cardsError } = await supabase
      .from("flashcards")
      .insert(cardRows);

    if (cardsError) {
      return NextResponse.json(
        { error: "Failed to save flashcards" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deck, cardCount: result.cards.length });
  } catch (err) {
    console.error("Flashcard generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate flashcards" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("flashcard_decks")
    .select("*")
    .order("created_at", { ascending: false });

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
