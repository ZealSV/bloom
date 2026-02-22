import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { openai } from "@/lib/openai";
import { toFile } from "openai";

const SUPPORTED_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/mpeg",
]);

const EXT_MAP: Record<string, string> = {
  "audio/mpeg": "mp3",
  "audio/mp3": "mp3",
  "audio/mp4": "m4a",
  "audio/m4a": "m4a",
  "audio/wav": "wav",
  "audio/webm": "webm",
  "audio/ogg": "ogg",
  "audio/flac": "flac",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/mpeg": "mpeg",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file");
  const title = (formData.get("title") as string) || "Uploaded Lecture";
  const subjectId = formData.get("subject_id") as string | null;

  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "No file provided" },
      { status: 400 }
    );
  }

  if (!SUPPORTED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `Unsupported file type: ${file.type}. Supported: mp3, mp4, m4a, wav, webm, ogg, flac, mov`,
      },
      { status: 400 }
    );
  }

  const maxSize = 25 * 1024 * 1024; // 25MB Whisper limit
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 25MB." },
      { status: 400 }
    );
  }

  try {
    // Create lecture record
    const { data: lecture, error: lectureError } = await supabase
      .from("lectures")
      .insert({
        user_id: user.id,
        title,
        status: "processing",
        ...(subjectId ? { subject_id: subjectId } : {}),
      })
      .select()
      .single();

    if (lectureError || !lecture) {
      return NextResponse.json(
        { error: "Failed to create lecture" },
        { status: 500 }
      );
    }

    // Transcribe with Whisper
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = EXT_MAP[file.type] || "mp4";
    const whisperFile = await toFile(buffer, `upload.${ext}`, {
      type: file.type,
    });

    const transcription = await openai.audio.transcriptions.create({
      model: "whisper-1",
      file: whisperFile,
      language: "en",
      response_format: "verbose_json",
    });

    const transcript =
      typeof transcription === "string"
        ? transcription
        : (transcription as any).text || "";

    const durationSeconds = Math.round(
      (transcription as any).duration || 0
    );

    // Update lecture with transcript
    await supabase
      .from("lectures")
      .update({
        transcript,
        status: "ready",
        duration_seconds: durationSeconds,
        updated_at: new Date().toISOString(),
      })
      .eq("id", lecture.id);

    return NextResponse.json({
      lecture: { ...lecture, transcript, status: "ready", duration_seconds: durationSeconds },
    });
  } catch (err) {
    console.error("Upload transcription error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Failed to process upload",
      },
      { status: 500 }
    );
  }
}
