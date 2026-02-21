import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, voice = "nova" } = await req.json();

  // Load topic for context
  let topic = "";
  if (sessionId) {
    const { data: session } = await supabase
      .from("sessions")
      .select("topic")
      .eq("id", sessionId)
      .single();
    if (session) {
      topic = session.topic;
    }
  }

  const response = await fetch(
    "https://api.openai.com/v1/realtime/sessions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice,
        modalities: ["audio", "text"],
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
    clientSecret: data.client_secret?.value,
    expiresAt: data.client_secret?.expires_at,
    topic,
  });
}
