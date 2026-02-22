import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { userOwnsSession } from "@/lib/session-access";
import { retrieveRelevantChunks } from "@/lib/rag";
import { buildVoiceInstructions } from "@/lib/realtime-prompts";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, voice = "shimmer" } = await req.json();

  // Load topic for context
  let topic = "";
  if (sessionId) {
    const ownsSession = await userOwnsSession(supabase, sessionId, user.id);
    if (!ownsSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const { data: session } = await supabase
      .from("sessions")
      .select("topic")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();
    if (session) {
      topic = session.topic;
    }
  }

  const retrieval = await retrieveRelevantChunks({
    supabase,
    userId: user.id,
    query: topic || "general teaching session",
    sessionId: sessionId || undefined,
    matchCount: 6,
    matchThreshold: 0.2,
  });

  const instructions = buildVoiceInstructions(topic, retrieval.contextText) +
    "\n\nIMPORTANT: Always respond in English.";

  // GA Realtime API — create ephemeral client secret with full session config
  const response = await fetch(
    "https://api.openai.com/v1/realtime/client_secrets",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        session: {
          type: "realtime",
          model: "gpt-realtime",
          instructions,
          audio: {
            input: {
              transcription: {
                model: "gpt-4o-transcribe",
                language: "en",
              },
              turn_detection: {
                type: "server_vad",
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 800,
                create_response: true,
                interrupt_response: true,
              },
            },
            output: { voice },
          },
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error("OpenAI Realtime error:", response.status, errorText);
    return NextResponse.json(
      { error: "Failed to create realtime session", details: errorText },
      { status: response.status }
    );
  }

  const data = await response.json();

  return NextResponse.json({
    clientSecret: data.value,
    expiresAt: data.expires_at,
    topic,
    referenceContext: retrieval.contextText,
  });
}
