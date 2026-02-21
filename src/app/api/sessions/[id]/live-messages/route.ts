import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import {
  parsebloomResponse,
  type bloomAnalysis,
} from "@/lib/ai-engine";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TranscriptMessage {
  role: "student" | "bloom";
  content: string;
  timestamp: number;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id: sessionId } = await params;
  const { messages } = (await req.json()) as {
    messages: TranscriptMessage[];
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Bulk insert messages
  const rows = messages.map((m) => ({
    session_id: sessionId,
    role: m.role,
    content: m.content,
  }));

  await supabase.from("messages").insert(rows);

  async function processAnalysis(analysis: bloomAnalysis) {
    for (const concept of analysis.concepts_discussed) {
      const { data: existing } = await supabase
        .from("concepts")
        .select("id")
        .eq("session_id", sessionId)
        .eq("name", concept.name)
        .single();

      if (existing) {
        await supabase
          .from("concepts")
          .update({
            mastery_score: concept.mastery_score,
            status:
              concept.mastery_score >= 80
                ? "mastered"
                : concept.mastery_score >= 40
                  ? "tested"
                  : "identified",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("concepts").insert({
          session_id: sessionId,
          name: concept.name,
          mastery_score: concept.mastery_score,
          status:
            concept.mastery_score >= 80
              ? "mastered"
              : concept.mastery_score >= 40
                ? "tested"
                : "identified",
        });
      }
    }

    for (const gap of analysis.gaps_detected) {
      const { data: existing } = await supabase
        .from("gaps")
        .select("id")
        .eq("session_id", sessionId)
        .eq("concept_name", gap.concept)
        .eq("resolved", false)
        .single();

      if (!existing) {
        await supabase.from("gaps").insert({
          session_id: sessionId,
          concept_name: gap.concept,
          description: gap.description,
        });
      }
    }

    for (const rel of analysis.concept_relationships) {
      const { data: existing } = await supabase
        .from("concept_relationships")
        .select("id")
        .eq("session_id", sessionId)
        .eq("from_concept", rel.from)
        .eq("to_concept", rel.to)
        .single();

      if (!existing) {
        await supabase.from("concept_relationships").insert({
          session_id: sessionId,
          from_concept: rel.from,
          to_concept: rel.to,
          relationship: rel.relationship,
          reasoning: rel.reasoning || null,
        });
      }
    }
  }

  // Run post-session analysis
  const transcript = messages
    .map((m) => `${m.role === "student" ? "Teacher" : "bloom"}: ${m.content}`)
    .join("\n");

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Analyze this teaching conversation transcript. Output ONLY a JSON block with your analysis:

\`\`\`json
{
  "concepts_discussed": [
    { "name": "concept name", "mastery_score": 0-100, "evidence": "brief explanation" }
  ],
  "gaps_detected": [
    { "concept": "concept name", "description": "what the teacher seems confused about" }
  ],
  "concept_relationships": [
    { "from": "concept A", "to": "concept B", "relationship": "requires|supports|contradicts|example_of", "reasoning": "brief explanation of why these concepts are connected" }
  ],
  "overall_session_mastery": 0-100
}
\`\`\`

MASTERY SCORING RUBRIC (be strict):
- 0-20: Teacher only named the concept
- 20-40: Surface-level explanation
- 40-60: Decent explanation but untested
- 60-80: Survived probing questions with real understanding
- 80-100: Deep mastery with edge cases and connections`,
        },
        {
          role: "user",
          content: `Here is the transcript of a live voice teaching session:\n\n${transcript}`,
        },
      ],
    });

    const responseText = completion.choices[0]?.message?.content || "";
    const { analysis } = parsebloomResponse(responseText);

    if (analysis) {
      await processAnalysis(analysis);
      return NextResponse.json({ success: true, analysis });
    }

    return NextResponse.json({ success: true, analysis: null });
  } catch {
    return NextResponse.json({ success: true, analysis: null });
  }
}
