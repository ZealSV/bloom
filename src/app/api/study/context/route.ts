import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";
import type { SourceType } from "@/types/study";

interface AggregateRequest {
  sourceType: SourceType;
  sourceIds?: string[];
  subjectId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sourceType, sourceIds, subjectId } =
      (await req.json()) as AggregateRequest;
    const admin = getSupabaseAdmin();
    const context: string[] = [];
    let documentCount = 0;
    let lectureCount = 0;
    let chunkCount = 0;

    // 1. Lecture transcripts
    if (sourceType === "all" || sourceType === "lecture") {
      let query = admin
        .from("lectures")
        .select("id, title, transcript, summary")
        .eq("user_id", user.id)
        .eq("status", "ready");

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      if (sourceType === "lecture" && sourceIds?.length) {
        query = query.in("id", sourceIds);
      }

      const { data: lectures } = await query;
      if (lectures?.length) {
        lectureCount = lectures.length;
        context.push("=== LECTURE TRANSCRIPTS ===");
        for (const l of lectures) {
          context.push(`\n--- Lecture: ${l.title} ---`);
          if (l.summary?.keyPoints?.length) {
            context.push("Key Points: " + l.summary.keyPoints.join("; "));
            if (l.summary.keyTerms?.length) {
              context.push(
                "Key Terms: " +
                  l.summary.keyTerms
                    .map(
                      (t: { term: string; definition: string }) =>
                        `${t.term}: ${t.definition}`
                    )
                    .join("; ")
              );
            }
          }
          if (l.transcript) {
            context.push("Transcript excerpt: " + l.transcript.slice(0, 3000));
          }
        }
      }
    }

    // 2. Document chunks
    if (sourceType === "all" || sourceType === "document") {
      let query = admin
        .from("documents")
        .select("id, title")
        .eq("user_id", user.id)
        .eq("status", "ready");

      if (subjectId) {
        query = query.eq("subject_id", subjectId);
      }

      if (sourceType === "document" && sourceIds?.length) {
        query = query.in("id", sourceIds);
      }

      const { data: documents, error: documentsError } = await query;
      if (documentsError) {
        console.error("Context documents query failed", {
          userId: user.id,
          sourceType,
          subjectId,
          error: documentsError.message,
        });
      }
      if (documents?.length) {
        documentCount = documents.length;
        context.push("\n=== UPLOADED DOCUMENTS ===");
        const documentIds = documents.map((doc) => doc.id);
        const { data: allChunks, error: chunksError } = await admin
          .from("chunks")
          .select("document_id, content")
          .in("document_id", documentIds);
        if (chunksError) {
          console.error("Context chunks query failed", {
            userId: user.id,
            sourceType,
            subjectId,
            documentCount: documentIds.length,
            error: chunksError.message,
          });
        }

        const chunksByDocument = new Map<string, string[]>();
        for (const chunk of allChunks ?? []) {
          const existing = chunksByDocument.get(chunk.document_id) ?? [];
          // Preserve historical behavior by only taking up to 15 chunks per document.
          if (existing.length < 15) {
            existing.push(chunk.content);
            chunksByDocument.set(chunk.document_id, existing);
          }
        }

        for (const doc of documents) {
          const contents = chunksByDocument.get(doc.id) ?? [];
          context.push(`\n--- Document: ${doc.title} ---`);
          if (contents.length) {
            chunkCount += contents.length;
            context.push(contents.join(" "));
          } else {
            context.push("No extracted text found yet for this document.");
          }
        }
      }
    }

    // 3. Chat session history (skip when bucket-scoped)
    if (!subjectId && (sourceType === "all" || sourceType === "session")) {
      let sessQuery = admin
        .from("sessions")
        .select("id, topic")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);

      if (sourceType === "session" && sourceIds?.length) {
        sessQuery = sessQuery.in("id", sourceIds);
      }

      const { data: sessions, error: sessionsError } = await sessQuery;
      if (sessionsError) {
        console.error("Context sessions query failed", {
          userId: user.id,
          sourceType,
          error: sessionsError.message,
        });
      }
      if (sessions?.length) {
        const sessionIds = sessions.map((session) => session.id);
        const { data: allMessages, error: messagesError } = await admin
          .from("messages")
          .select("session_id, role, content, created_at")
          .in("session_id", sessionIds)
          .order("created_at", { ascending: true });
        if (messagesError) {
          console.error("Context messages query failed", {
            userId: user.id,
            sourceType,
            sessionCount: sessionIds.length,
            error: messagesError.message,
          });
        }

        const messagesBySession = new Map<
          string,
          Array<{ role: string; content: string }>
        >();
        for (const message of allMessages ?? []) {
          const existing = messagesBySession.get(message.session_id) ?? [];
          // Preserve historical behavior by only taking up to 30 messages per session.
          if (existing.length < 30) {
            existing.push({ role: message.role, content: message.content });
            messagesBySession.set(message.session_id, existing);
          }
        }

        context.push("\n=== CHAT SESSION HISTORY ===");
        for (const sess of sessions) {
          const messages = messagesBySession.get(sess.id);

          if (messages?.length) {
            context.push(`\n--- Session: ${sess.topic} ---`);
            context.push(
              messages
                .map(
                  (m) =>
                    `${m.role === "student" ? "Student" : "Bloom"}: ${m.content}`
                )
                .join("\n")
            );
          }
        }
      }
    }

    // 4. Knowledge gaps + mastery (skip when bucket-scoped)
    if (!subjectId) {
      const { data: allSessions } = await admin
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      if (allSessions?.length) {
        const sessionIds = allSessions.map((s) => s.id);

        const { data: gaps } = await admin
          .from("gaps")
          .select("concept_name, description")
          .in("session_id", sessionIds)
          .eq("resolved", false)
          .limit(20);

        if (gaps?.length) {
          context.push("\n=== DETECTED KNOWLEDGE GAPS (unresolved) ===");
          for (const gap of gaps) {
            context.push(
              `- ${gap.concept_name}: ${gap.description || "No description"}`
            );
          }
        }

        const { data: concepts } = await admin
          .from("concepts")
          .select("name, mastery_score, status")
          .in("session_id", sessionIds)
          .order("mastery_score", { ascending: true })
          .limit(30);

        if (concepts?.length) {
          context.push("\n=== CONCEPT MASTERY LEVELS ===");
          for (const c of concepts) {
            context.push(`- ${c.name}: ${c.mastery_score}% (${c.status})`);
          }
        }
      }
    }

    return NextResponse.json({
      context: context.join("\n"),
      stats: { documentCount, lectureCount, chunkCount },
    });
  } catch (err) {
    console.error("Context aggregation error:", err);
    const message =
      err instanceof Error && err.message
        ? err.message
        : "Failed to aggregate context";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
