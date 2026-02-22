import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { EXAM_GENERATION_PROMPT } from "@/lib/study-prompts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sourceType = "all", sourceIds, subjectId } = await req.json();

  // Aggregate knowledge context
  const ctxRes = await fetch(new URL("/api/study/context", req.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      cookie: req.headers.get("cookie") || "",
    },
    body: JSON.stringify({ sourceType, sourceIds, subjectId }),
  });

  if (!ctxRes.ok) {
    return NextResponse.json(
      { error: "Failed to aggregate context" },
      { status: 500 }
    );
  }

  const { context, stats } = await ctxRes.json();

  if (subjectId && stats?.documentCount === 0 && stats?.lectureCount === 0) {
    return NextResponse.json(
      {
        error:
          "This bucket has no uploads yet. Upload a PDF or lecture to generate an exam.",
      },
      { status: 400 }
    );
  }

  if (!context || context.length < 50) {
    return NextResponse.json(
      {
        error:
          "Not enough learning data to generate an exam. Try adding lectures, documents, or chat sessions first.",
      },
      { status: 400 }
    );
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: EXAM_GENERATION_PROMPT },
        {
          role: "user",
          content: `Here is the student's complete learning data:\n\n${context}\n\nGenerate a practice exam based on this material.`,
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 4000,
    });

    const resultText = completion.choices[0]?.message?.content || "{}";
    const result = JSON.parse(resultText);

    if (!result.questions || !Array.isArray(result.questions)) {
      return NextResponse.json(
        { error: "Failed to generate valid exam" },
        { status: 500 }
      );
    }

    const { data: exam, error: examError } = await supabase
      .from("practice_exams")
      .insert({
        user_id: user.id,
        title: result.title || "Practice Exam",
        questions: result.questions,
        source_type: sourceType,
        source_ids: sourceIds || [],
        ...(subjectId ? { subject_id: subjectId } : {}),
      })
      .select()
      .single();

    if (examError || !exam) {
      return NextResponse.json(
        { error: "Failed to create exam" },
        { status: 500 }
      );
    }

    return NextResponse.json({ exam });
  } catch (err) {
    console.error("Exam generation error:", err);
    return NextResponse.json(
      { error: "Failed to generate exam" },
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

  const subjectId = req.nextUrl.searchParams.get("subject_id");

  let query = supabase
    .from("practice_exams")
    .select("*")
    .order("created_at", { ascending: false });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query;

  if (error)
    return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
