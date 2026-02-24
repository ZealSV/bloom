import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import OpenAI from "openai";
import {
  parsebloomResponse,
  type bloomAnalysis,
} from "@/lib/ai-engine";
import { userOwnsSession } from "@/lib/session-access";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

interface TranscriptMessage {
  role: "student" | "bloom";
  content: string;
  timestamp: number;
}

function normalizeForDedup(content: string): string {
  return content
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function logDbFailure(
  operation: string,
  userId: string,
  sessionId: string,
  error: unknown,
) {
  const dbError = error as
    | { message?: string; code?: string; details?: string; hint?: string }
    | undefined;
  console.error("live_messages_db_write_failed", {
    operation,
    userId,
    sessionId,
    message: dbError?.message ?? "Unknown database error",
    code: dbError?.code ?? null,
    details: dbError?.details ?? null,
    hint: dbError?.hint ?? null,
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const userId = user.id;

  const { id: sessionId } = await params;
  const ownsSession = await userOwnsSession(supabase, sessionId, userId);
  if (!ownsSession) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }
  const { messages } = (await req.json()) as {
    messages: TranscriptMessage[];
  };

  if (!messages?.length) {
    return NextResponse.json({ error: "No messages" }, { status: 400 });
  }

  // Safety dedup: repeated realtime transcript finals can arrive twice.
  const dedupedMessages: TranscriptMessage[] = [];
  const lastSeenByKey = new Map<string, number>();
  for (const m of messages) {
    const content = typeof m?.content === "string" ? m.content.trim() : "";
    if (!content) continue;
    const role = m?.role === "bloom" ? "bloom" : "student";
    const normalized = normalizeForDedup(content);
    if (!normalized) continue;
    const ts = Number.isFinite(m?.timestamp) ? m.timestamp : Date.now();
    const key = `${role}:${normalized}`;
    const lastTs = lastSeenByKey.get(key);
    if (lastTs && Math.abs(ts - lastTs) < 10000) {
      continue;
    }
    lastSeenByKey.set(key, ts);
    dedupedMessages.push({ role, content, timestamp: ts });
  }

  // Bulk insert messages
  const rows = dedupedMessages.map((m) => ({
    session_id: sessionId,
    role: m.role,
    content: m.content,
  }));

  const { error: messagesInsertError } = await supabase.from("messages").insert(rows);
  if (messagesInsertError) {
    logDbFailure("bulk_insert_messages", userId, sessionId, messagesInsertError);
    return NextResponse.json(
      { error: "Failed to save live messages" },
      { status: 500 },
    );
  }

  async function processAnalysis(analysis: bloomAnalysis) {
    for (const concept of analysis.concepts_discussed) {
      const { data: existing, error: conceptLookupError } = await supabase
        .from("concepts")
        .select("id")
        .eq("session_id", sessionId)
        .eq("name", concept.name)
        .single();
      if (conceptLookupError && conceptLookupError.code !== "PGRST116") {
        logDbFailure("lookup_concept", userId, sessionId, conceptLookupError);
        throw new Error("Failed to lookup concept");
      }

      if (existing) {
        const { error: conceptUpdateError } = await supabase
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
        if (conceptUpdateError) {
          logDbFailure("update_concept", userId, sessionId, conceptUpdateError);
          throw new Error("Failed to update concept");
        }
      } else {
        const { error: conceptInsertError } = await supabase.from("concepts").insert({
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
        if (conceptInsertError) {
          logDbFailure("insert_concept", userId, sessionId, conceptInsertError);
          throw new Error("Failed to insert concept");
        }
      }
    }

    for (const gap of analysis.gaps_detected) {
      const { data: existing, error: gapLookupError } = await supabase
        .from("gaps")
        .select("id")
        .eq("session_id", sessionId)
        .eq("concept_name", gap.concept)
        .eq("resolved", false)
        .single();
      if (gapLookupError && gapLookupError.code !== "PGRST116") {
        logDbFailure("lookup_gap", userId, sessionId, gapLookupError);
        throw new Error("Failed to lookup gap");
      }

      if (!existing) {
        const { error: gapInsertError } = await supabase.from("gaps").insert({
          session_id: sessionId,
          concept_name: gap.concept,
          description: gap.description,
        });
        if (gapInsertError) {
          logDbFailure("insert_gap", userId, sessionId, gapInsertError);
          throw new Error("Failed to insert gap");
        }
      }
    }

    for (const rel of analysis.concept_relationships) {
      const { data: existing, error: relationshipLookupError } = await supabase
        .from("concept_relationships")
        .select("id")
        .eq("session_id", sessionId)
        .eq("from_concept", rel.from)
        .eq("to_concept", rel.to)
        .single();
      if (relationshipLookupError && relationshipLookupError.code !== "PGRST116") {
        logDbFailure(
          "lookup_concept_relationship",
          userId,
          sessionId,
          relationshipLookupError,
        );
        throw new Error("Failed to lookup concept relationship");
      }

      if (!existing) {
        const { error: relationshipInsertError } = await supabase
          .from("concept_relationships")
          .insert({
          session_id: sessionId,
          from_concept: rel.from,
          to_concept: rel.to,
          relationship: rel.relationship,
          reasoning: rel.reasoning || null,
        });
        if (relationshipInsertError) {
          logDbFailure(
            "insert_concept_relationship",
            userId,
            sessionId,
            relationshipInsertError,
          );
          throw new Error("Failed to insert concept relationship");
        }
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
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown processing error";
    console.error("live_messages_processing_failed", {
      userId,
      sessionId,
      message: errorMessage,
    });

    if (errorMessage.startsWith("Failed to")) {
      return NextResponse.json(
        { error: "Failed to process live session analysis" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, analysis: null });
  }
}
