import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase-server";
import {
  streambloomResponse,
  type ChatMessage,
  type bloomAnalysis,
} from "@/lib/ai-engine";
import { userOwnsSession } from "@/lib/session-access";
import { retrieveRelevantChunks } from "@/lib/rag";

function logDbFailure(
  operation: string,
  userId: string,
  sessionId: string,
  error: unknown,
) {
  const dbError = error as
    | { message?: string; code?: string; details?: string; hint?: string }
    | undefined;
  console.error("chat_db_write_failed", {
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
  if (!user) return new Response("Unauthorized", { status: 401 });
  const userId = user.id;

  const { id: sessionId } = await params;
  const { message } = await req.json();
  const ownsSession = await userOwnsSession(supabase, sessionId, userId);
  if (!ownsSession) {
    return new Response("Session not found", { status: 404 });
  }

  if (!message) {
    return new Response("Message is required", { status: 400 });
  }

  // Save the student's message
  const { error: studentMessageError } = await supabase.from("messages").insert({
    session_id: sessionId,
    role: "student",
    content: message,
  });
  if (studentMessageError) {
    logDbFailure("insert_student_message", userId, sessionId, studentMessageError);
    return new Response("Failed to save message", { status: 500 });
  }

  // Get conversation history
  const { data: history, error: historyError } = await supabase
    .from("messages")
    .select("role, content")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });
  if (historyError) {
    console.error("chat_history_read_failed", {
      userId,
      sessionId,
      message: historyError.message,
      code: historyError.code,
      details: historyError.details,
      hint: historyError.hint,
    });
    return new Response("Failed to load chat history", { status: 500 });
  }

  const chatHistory: ChatMessage[] = (history || []).map((m) => ({
    role: m.role === "student" ? ("user" as const) : ("assistant" as const),
    content: m.content,
  }));

  async function processAnalysis(analysis: bloomAnalysis) {
    // Upsert concepts
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

    // Insert new gaps
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

    // Insert concept relationships
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

  // Stream response
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        let chatMessage = "";

        const retrieval = await retrieveRelevantChunks({
          supabase,
          userId,
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
            const { error: bloomMessageError } = await supabase.from("messages").insert({
              session_id: sessionId,
              role: "bloom",
              content: chatMessage,
            });
            if (bloomMessageError) {
              logDbFailure("insert_bloom_message", userId, sessionId, bloomMessageError);
              throw new Error("Failed to save bloom response");
            }

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
        console.error("chat_stream_failed", {
          userId,
          sessionId,
          message: error instanceof Error ? error.message : "Unknown stream error",
        });
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
