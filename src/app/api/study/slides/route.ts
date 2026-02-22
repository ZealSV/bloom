import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { SLIDE_DECK_PROMPT } from "@/lib/study-prompts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    subjectId,
    title,
    slideCount = 8,
    sourceType = "all",
    sourceIds,
    template = "minimal_light",
    generateImages = true,
  } = (await req.json()) as {
    subjectId?: string;
    title?: string;
    slideCount?: number;
    sourceType?: "lecture" | "document" | "session" | "all";
    sourceIds?: string[];
    template?: string;
    generateImages?: boolean;
  };

  if (!subjectId) {
    console.error("[slides] Missing subjectId");
    return NextResponse.json({ error: "Missing subjectId" }, { status: 400 });
  }

  // Aggregate bucket-scoped context (documents + lectures only)
  const ctxRes = await fetch(new URL("/api/study/context", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ sourceType, sourceIds, subjectId }),
  });

  if (!ctxRes.ok) {
    const ctxText = await ctxRes.text().catch(() => "");
    console.error("[slides] Context fetch failed:", ctxRes.status, ctxText);
    return NextResponse.json(
      { error: "Failed to aggregate context" },
      { status: 500 }
    );
  }

  const { context, stats } = await ctxRes.json();
  console.error("[slides] Context stats:", stats);

  if (stats?.documentCount === 0 && stats?.lectureCount === 0) {
    console.error("[slides] No bucket uploads found");
    return NextResponse.json(
      { error: "This bucket has no uploads yet. Upload a PDF or lecture first." },
      { status: 400 }
    );
  }

  if (!context || context.length < 50) {
    console.error("[slides] Not enough context length:", context?.length || 0);
    return NextResponse.json(
      { error: "Not enough learning data to generate slides." },
      { status: 400 }
    );
  }

  try {
    console.error("[slides] Generating outline with OpenAI");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: SLIDE_DECK_PROMPT },
        {
          role: "user",
          content: `Topic: ${title || "Untitled"}\nRequested slide count: ${slideCount}\n\nContext:\n${context}\n\nGenerate the slide deck JSON now.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 3500,
    });

    const resultText = completion.choices[0]?.message?.content || "{}";
    console.error("[slides] OpenAI raw response length:", resultText.length);
    const result = JSON.parse(resultText);

    if (!result.slides || !Array.isArray(result.slides)) {
      console.error("[slides] Invalid slide JSON:", resultText.slice(0, 500));
      return NextResponse.json(
        { error: "Failed to generate valid slides" },
        { status: 500 }
      );
    }

    const { data: deck, error: deckError } = await supabase
      .from("slide_decks")
      .insert({
        user_id: user.id,
        subject_id: subjectId,
        title: result.title || title || "Slide Deck",
        slide_count: result.slides.length,
        template,
      })
      .select()
      .single();

    if (deckError || !deck) {
      console.error("[slides] Deck insert error:", deckError);
      return NextResponse.json(
        { error: "Failed to create slide deck" },
        { status: 500 }
      );
    }

    const slideRows = [];

    const defaultLayoutsByTemplate: Record<string, string[]> = {
      minimal_light: ["title-top", "image-right", "captioned", "title-left"],
      modern_ink: ["split-visual", "title-overlay", "image-left", "title-top"],
      classic_lecture: ["title-top", "title-left", "captioned", "title-top"],
      dark_night: ["full-visual", "title-overlay", "split-visual", "title-top"],
      studio_green: ["image-right", "split-visual", "title-top", "captioned"],
    };

    const pickLayout = (index: number, provided?: string | null) => {
      if (provided) return provided;
      const seq = defaultLayoutsByTemplate[template] || defaultLayoutsByTemplate.minimal_light;
      return seq[index % seq.length];
    };

    const normalizeBullet = (b: string) => b.trim();

    const inferSlideType = (title: string, bullets: string[]) => {
      const text = `${title} ${bullets.join(" ")}`.toLowerCase();
      if (/define|definition|what is|overview|intro/.test(text)) return "Definition";
      if (/process|steps|workflow|pipeline|how to|mechanism/.test(text)) return "Process";
      if (/compare|versus|vs\.|difference|contrast/.test(text)) return "Comparison";
      if (/example|case|application|scenario/.test(text)) return "Example";
      if (/pitfall|mistake|misconception|avoid/.test(text)) return "Pitfall";
      if (/summary|recap|takeaway|key points/.test(text)) return "Summary";
      return "Concept";
    };

    const visualTypes = new Set(["Process", "Comparison", "Example"]);

    for (let i = 0; i < result.slides.length; i += 1) {
      const s = result.slides[i] as {
        title: string;
        bullets: string[];
        speakerNotes?: string;
        imagePrompt?: string;
        layout?: string;
        heroBullet?: string;
      };

      const bullets = Array.isArray(s.bullets) ? s.bullets.map(normalizeBullet) : [];
      const hero =
        s.heroBullet && bullets.includes(s.heroBullet)
          ? s.heroBullet
          : bullets[0] || "";
      const layout = pickLayout(i, s.layout);

      const prompt =
        s.imagePrompt ||
        `${s.title || "Slide"}: ${bullets.slice(0, 4).join("; ")}`;

      slideRows.push({
        deck_id: deck.id,
        slide_index: i,
        title: s.title || `Slide ${i + 1}`,
        bullets,
        speaker_notes: s.speakerNotes || "",
        image_url: null,
        layout,
        hero_bullet: hero || null,
      });
    }

    if (generateImages) {
      const candidates = result.slides
        .map((s, idx) => {
          const bullets = Array.isArray(s.bullets) ? s.bullets.map(normalizeBullet) : [];
          const type = inferSlideType(s.title || "", bullets);
          return {
            idx,
            type,
            title: s.title || `Slide ${idx + 1}`,
            bullets,
            prompt: s.imagePrompt || `${s.title || "Slide"}: ${bullets.slice(0, 4).join("; ")}`,
          };
        })
        .filter((c) => visualTypes.has(c.type));

      const maxImages = 3;
      const picked = candidates.slice(0, maxImages);
      console.error("[slides] Generating images:", {
        candidateCount: candidates.length,
        pickedCount: picked.length,
        pickedTypes: picked.map((c) => c.type),
      });

      for (let i = 0; i < result.slides.length; i += 1) {
        const pickedSlide = picked.find((p) => p.idx === i);
        if (!pickedSlide) continue;

        try {
          const img = await openai.images.generate({
            model: "gpt-image-1",
            prompt: `${pickedSlide.prompt}. Style: ${template.replace(
              "_",
              " "
            )}. Clean, informative, slide-friendly.`,
            size: "1024x1024",
          });
          const b64 = img.data?.[0]?.b64_json;
          if (b64) {
            slideRows[pickedSlide.idx].image_url = `data:image/png;base64,${b64}`;
          }
        } catch (err) {
          console.error("[slides] Slide image generation failed (skipping):", err);
        }
      }
    } else {
      console.error("[slides] Image generation disabled");
    }

    const { error: slidesError } = await supabase.from("slides").insert(slideRows);

    if (slidesError) {
      console.error("[slides] Slide insert error:", slidesError);
      return NextResponse.json(
        { error: "Failed to save slides" },
        { status: 500 }
      );
    }

    return NextResponse.json({ deckId: deck.id, slideCount: slideRows.length });
  } catch (err) {
    console.error("[slides] Slide generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate slides" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subjectId = req.nextUrl.searchParams.get("subject_id");
  const deckId = req.nextUrl.searchParams.get("deck_id");

  if (deckId) {
    const { data: slides, error } = await supabase
      .from("slides")
      .select("*")
      .eq("deck_id", deckId)
      .order("slide_index", { ascending: true });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(slides || []);
  }

  let query = supabase
    .from("slide_decks")
    .select("*")
    .order("created_at", { ascending: false });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data || []);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const deckId = req.nextUrl.searchParams.get("deck_id");
  if (!deckId) {
    return NextResponse.json({ error: "Missing deck_id" }, { status: 400 });
  }

  const { data: deck, error: deckError } = await supabase
    .from("slide_decks")
    .select("id, user_id")
    .eq("id", deckId)
    .single();

  if (deckError || !deck || deck.user_id !== user.id) {
    return NextResponse.json({ error: "Deck not found" }, { status: 404 });
  }

  const { error } = await supabase
    .from("slide_decks")
    .delete()
    .eq("id", deckId);

  if (error) {
    return NextResponse.json({ error: "Failed to delete deck" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
