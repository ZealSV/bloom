import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  streambloomResponse,
  type ChatMessage,
  type bloomAnalysis,
} from "@/lib/ai-engine";
import { userOwnsSession } from "@/lib/session-access";
import { retrieveRelevantChunks } from "@/lib/rag";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response("Unauthorized", { status: 401 });

  const { id: sessionId } = await params;
  const { message } = await req.json();
  const ownsSession = await userOwnsSession(supabase, sessionId, user.id);
  if (!ownsSession) {
    return new Response("Session not found", { status: 404 });
  }

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

        const retrieval = await retrieveRelevantChunks({
          supabase,
          userId: user.id,
          query: message,
          sessionId,
        });

        for await (const event of streambloomResponse(
          chatHistory,
          message,
          retrieval.contextText
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
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "done",
                  chatMessage,
                  citations: retrieval.citations,
                })}\n\n`
              ),
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
