import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { LECTURE_SUMMARY_PROMPT } from "@/lib/study-prompts";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: lectureId } = await params;

  const { data: lecture } = await supabase
    .from("lectures")
    .select("id, transcript, title, status")
    .eq("id", lectureId)
    .single();

  if (!lecture)
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!lecture.transcript || lecture.transcript.length < 50)
    return NextResponse.json(
      { error: "Transcript too short to summarize" },
      { status: 400 }
    );

  await supabase
    .from("lectures")
    .update({ status: "processing" })
    .eq("id", lectureId);

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: LECTURE_SUMMARY_PROMPT },
        { role: "user", content: lecture.transcript },
      ],
      response_format: { type: "json_object" },
      max_tokens: 2000,
    });

    const summaryText = completion.choices[0]?.message?.content || "{}";
    const summary = JSON.parse(summaryText);

    const updateData: Record<string, unknown> = {
      summary,
      status: "ready",
      updated_at: new Date().toISOString(),
    };

    if (summary.title && lecture.title === "Untitled Lecture") {
      updateData.title = summary.title;
    }

    await supabase.from("lectures").update(updateData).eq("id", lectureId);

    return NextResponse.json({ summary });
  } catch (err) {
    console.error("Summarization error:", err);
    await supabase
      .from("lectures")
      .update({ status: "failed" })
      .eq("id", lectureId);
    return NextResponse.json(
      { error: "Summarization failed" },
      { status: 500 }
    );
  }
}
