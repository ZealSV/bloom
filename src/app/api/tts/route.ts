import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response("Unauthorized", { status: 401 });

    let text = "";
    try {
      const body = await req.json();
      text = typeof body?.text === "string" ? body.text : "";
    } catch (e) {
      console.error("[tts] Invalid JSON payload.", { error: String(e) });
      return new Response("Invalid request payload", { status: 400 });
    }

    if (!text) {
      return new Response("Text is required", { status: 400 });
    }

    // OpenAI TTS has a 4096 character limit
    const truncatedText = text.slice(0, 4096);

    const response = await openai.audio.speech.create({
      model: "tts-1",
      voice: "shimmer",
      input: truncatedText,
      response_format: "mp3",
    });

    return new Response(response.body as ReadableStream, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-cache",
      },
    });
  } catch (e) {
    console.error("[tts] Speech generation failed.", { error: String(e) });
    return new Response("Failed to generate speech", { status: 502 });
  }
}
