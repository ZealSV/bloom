import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { toFile } from "openai";

export async function POST(
  req: NextRequest,
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
    .select("id, transcript, status")
    .eq("id", lectureId)
    .single();

  if (!lecture)
    return NextResponse.json({ error: "Lecture not found" }, { status: 404 });

  const formData = await req.formData();
  const audioBlob = formData.get("audio");

  if (!(audioBlob instanceof Blob))
    return NextResponse.json({ error: "No audio provided" }, { status: 400 });

  try {
    const arrayBuffer = await audioBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const file = await toFile(buffer, "chunk.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file,
      language: "en",
      response_format: "text",
    });

    const chunkText =
      typeof transcription === "string"
        ? transcription
        : ((transcription as Record<string, unknown>).text as string) || "";

    const updatedTranscript = lecture.transcript
      ? `${lecture.transcript} ${chunkText}`
      : chunkText;

    await supabase
      .from("lectures")
      .update({
        transcript: updatedTranscript,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lectureId);

    return NextResponse.json({ chunkText, fullTranscript: updatedTranscript });
  } catch (err) {
    console.error("Transcription error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Transcription failed" },
      { status: 500 }
    );
  }
}
