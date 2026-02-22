import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import { openai } from "@/lib/openai";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { topic } = (await req.json()) as { topic?: string };
  const normalized = typeof topic === "string" ? topic.trim() : "";
  if (!normalized) {
    return NextResponse.json({ error: "Topic is required" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  const { data: existing } = await admin
    .from("broad_topics")
    .select("id")
    .ilike("topic", normalized)
    .limit(1);

  if (existing && existing.length > 0) {
    return NextResponse.json({ broad: true });
  }

  const prompt = `Classify the user's topic as BROAD or SPECIFIC.
BROAD means a large academic field or umbrella subject (e.g., biology, physics, computer science, economics).
SPECIFIC means a narrow concept, technique, or concrete topic (e.g., "binary trees", "mitosis", "Fortnite").
Respond with only BROAD or SPECIFIC.

Topic: "${normalized}"`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 5,
    });

    const result = completion.choices[0]?.message?.content?.trim().toUpperCase();
    const isBroad = result === "BROAD";

    if (isBroad) {
      await admin
        .from("broad_topics")
        .upsert({ topic: normalized, created_by: user.id }, { onConflict: "topic" });
    }

    return NextResponse.json({ broad: isBroad });
  } catch (err) {
    console.error("Topic classification error:", err);
    return NextResponse.json({ broad: false });
  }
}
