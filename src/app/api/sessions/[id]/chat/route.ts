import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  streambloomResponse,
  type ChatMessage,
  type bloomAnalysis,
} from "@/lib/ai-engine";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id: sessionId } = await params;
  const { message } = await req.json();

  if (!message) {
    return new Response("Message is required", { status: 400 });
  }

  // Save the student's message
  await supabase.from("messages").insert({
    session_id: sessionId,
    role: "student",
    content: message,
  });

  // Get conversation history
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  const chatHistory: ChatMessage[] = (history || []).map((m) => ({
    role: m.role === "student" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  async function parseEmbeddingValue(value: unknown): Promise<number[] | null> {
    if (Array.isArray(value)) {
      const nums = value.map((v) => Number(v)).filter((n) => Number.isFinite(n));
      return nums.length > 0 ? nums : null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed.startsWith("[") || !trimmed.endsWith("]")) return null;
      const parts = trimmed.slice(1, -1).split(",");
      const nums = parts.map((p) => Number(p.trim())).filter((n) => Number.isFinite(n));
      return nums.length > 0 ? nums : null;
    }
    return null;
  }

  function cosineSimilarity(a: number[], b: number[]): number {
    const len = Math.min(a.length, b.length);
    if (len === 0) return 0;
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < len; i += 1) {
      const av = a[i];
      const bv = b[i];
      dot += av * bv;
      normA += av * av;
      normB += bv * bv;
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  async function fetchReferenceContext(query: string, userId: string) {
    if (!process.env.OPENAI_API_KEY) return "";

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: query,
    });

    const queryEmbedding = embeddingResponse.data[0]?.embedding;
    if (!queryEmbedding) return "";

    const { data: chunkRows } = await supabase
      .from("chunks")
      .select("content, embedding")
      .eq("user_id", userId)
      .limit(200);

    if (!Array.isArray(chunkRows) || chunkRows.length === 0) return "";

    const scored: { content: string; score: number }[] = [];

    for (const row of chunkRows) {
      const embedding = await parseEmbeddingValue(row.embedding);
      if (!embedding) continue;
      const score = cosineSimilarity(queryEmbedding, embedding);
      scored.push({ content: row.content, score });
    }

    scored.sort((a, b) => b.score - a.score);
    const top = scored.filter((s) => s.score > 0.18).slice(0, 8);
    if (top.length === 0) return "";

    return top
      .map((s, i) => `(${i + 1}) ${s.content.slice(0, 800)}`)
      .join("\n\n");
  }

  async function processAnalysis(analysis: bloomAnalysis) {
    // Upsert concepts
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

    // Insert new gaps
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

    // Insert concept relationships
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

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let chatMessage = "";

        const referenceContext = await fetchReferenceContext(message, user.id);

        for await (const event of streambloomResponse(
          chatHistory,
          message,
          referenceContext
        )) {
          if (event.type === "text") {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "text", content: event.content })}\n\n`,
              ),
            );
          } else if (event.type === "analysis") {
            // Process analysis in background
            await processAnalysis(event.content);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ type: "analysis", content: event.content })}\n\n`,
              ),
            );
          } else if (event.type === "done") {
            chatMessage = event.chatMessage;

            // Save bloom's response (chat part only)
            await supabase.from("messages").insert({
              session_id: sessionId,
              role: "bloom",
              content: chatMessage,
            });

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "done", chatMessage })}\n\n`),
            );
          }
        }
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: "Something went wrong. Please try again." })}\n\n`,
          ),
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
