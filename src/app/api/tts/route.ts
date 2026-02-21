import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { text } = await req.json();

  if (!text || typeof text !== "string") {
    return new Response("Text is required", { status: 400 });
  }

  // OpenAI TTS has a 4096 character limit
  const truncatedText = text.slice(0, 4096);

  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "nova",
    input: truncatedText,
    response_format: "mp3",
  });

  return new Response(response.body as ReadableStream, {
    headers: {
      "Content-Type": "audio/mpeg",
      "Cache-Control": "no-cache",
    },
  });
}
