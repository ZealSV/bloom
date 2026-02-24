import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { userOwnsSession } from "@/lib/session-access";
import { ingestDocument } from "@/lib/ingest-document";

const MATERIALS_BUCKET = "learning materials";
const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024;
const MAX_UPLOAD_SIZE_MB = Math.round(MAX_UPLOAD_SIZE_BYTES / (1024 * 1024));

function isMissingDbObjectError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const code = error.code || "";
  const message = (error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("not found in the schema cache")
  );
}

function isMissingSubjectIdColumnError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = (error.message || "").toLowerCase();
  return (
    (error.code === "42703" || error.code === "PGRST204" || error.code === "PGRST205") &&
    message.includes("subject_id")
  );
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const fileValue = formData.get("file");
    const titleValue = formData.get("title");
    const sessionIdValue = formData.get("sessionId");
    const subjectIdValue = formData.get("subjectId");

    const sessionId =
      typeof sessionIdValue === "string" && sessionIdValue.trim()
        ? sessionIdValue.trim()
        : null;
    const subjectId =
      typeof subjectIdValue === "string" && subjectIdValue.trim()
        ? subjectIdValue.trim()
        : null;

    if (sessionId) {
      const ownsSession = await userOwnsSession(supabase, sessionId, user.id);
      if (!ownsSession) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
    }

    if (subjectId) {
      const { data: subject, error: subjectError } = await supabase
        .from("subjects")
        .select("id")
        .eq("id", subjectId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (subjectError) {
        const isInvalidSubjectId = subjectError.code === "22P02";
        if (isInvalidSubjectId) {
          console.warn("Invalid subjectId on upload", {
            userId: user.id,
            subjectId,
          });
          return NextResponse.json(
            { error: "Subject not found" },
            { status: 404 }
          );
        }

        console.error("Failed to validate upload subject ownership", {
          userId: user.id,
          subjectId,
          error: subjectError.message,
          code: subjectError.code,
        });
        return NextResponse.json(
          { error: "Failed to validate subject" },
          { status: 500 }
        );
      }

      if (!subject) {
        console.warn("Upload rejected for non-owned subject", {
          userId: user.id,
          subjectId,
        });
        return NextResponse.json(
          { error: "Subject not found" },
          { status: 404 }
        );
      }
    }

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const file = fileValue;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { error: `Unsupported file type: ${file.type || "unknown"}. Please upload a PDF.` },
        { status: 400 }
      );
    }
    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      console.warn("[upload] Rejected oversized PDF", {
        userId: user.id,
        fileName: file.name,
        fileSizeBytes: file.size,
        maxSizeBytes: MAX_UPLOAD_SIZE_BYTES,
      });
      return NextResponse.json(
        {
          error: `File too large. Maximum PDF size is ${MAX_UPLOAD_SIZE_MB}MB (${MAX_UPLOAD_SIZE_BYTES} bytes).`,
        },
        { status: 400 }
      );
    }
    const userId = user.id;
    const title =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : file.name;

    const baseInsert = {
      user_id: userId,
      title,
      file_type: file.type,
      file_path: "",
      status: "uploaded",
    };

    let insertResult = await supabaseAdmin
      .from("documents")
      .insert({
        ...baseInsert,
        ...(subjectId ? { subject_id: subjectId } : {}),
      })
      .select()
      .single();

    if (subjectId && isMissingSubjectIdColumnError(insertResult.error)) {
      insertResult = await supabaseAdmin
        .from("documents")
        .insert(baseInsert)
        .select()
        .single();
    }

    const { data: document, error: insertError } = insertResult;

    if (insertError || !document) {
      const reason = insertError
        ? `${insertError.message || "Unknown error"}${insertError.code ? ` (${insertError.code})` : ""}`
        : "No document returned";
      return NextResponse.json(
        { error: `Failed to create document record: ${reason}` },
        { status: 500 }
      );
    }

    const fileExt = file.name.split(".").pop() || "pdf";
    const storagePath = `${userId}/${document.id}/original.${fileExt}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload storage failure", {
        userId,
        documentId: document.id,
        storagePath,
        error: uploadError.message,
      });

      const { error: cleanupDocumentError } = await supabaseAdmin
        .from("documents")
        .delete()
        .eq("id", document.id)
        .eq("user_id", userId);

      if (cleanupDocumentError) {
        console.error("Upload cleanup failure after storage error", {
          userId,
          documentId: document.id,
          error: cleanupDocumentError.message,
        });
      }

      return NextResponse.json(
        {
          error: cleanupDocumentError
            ? "Failed to upload file to storage; cleanup of draft record also failed"
            : "Failed to upload file to storage; draft record cleaned up",
        },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ file_path: storagePath, status: "uploaded" })
      .eq("id", document.id);

    if (updateError) {
      console.error("Upload metadata update failure", {
        userId,
        documentId: document.id,
        storagePath,
        error: updateError.message,
      });

      const { error: storageCleanupError } = await supabaseAdmin.storage
        .from(MATERIALS_BUCKET)
        .remove([storagePath]);
      if (storageCleanupError) {
        console.error("Upload cleanup failure removing storage object", {
          userId,
          documentId: document.id,
          storagePath,
          error: storageCleanupError.message,
        });
      }

      const { error: documentCleanupError } = await supabaseAdmin
        .from("documents")
        .delete()
        .eq("id", document.id)
        .eq("user_id", userId);
      if (documentCleanupError) {
        console.error("Upload cleanup failure removing document row", {
          userId,
          documentId: document.id,
          error: documentCleanupError.message,
        });
      }

      return NextResponse.json(
        {
          error:
            storageCleanupError || documentCleanupError
              ? "Failed to update file path; cleanup of uploaded assets was partial"
              : "Failed to update file path; uploaded assets were cleaned up",
        },
        { status: 500 }
      );
    }

    if (sessionId) {
      const { error: linkError } = await (supabaseAdmin as any)
        .from("session_documents")
        .upsert(
          {
            session_id: sessionId,
            document_id: document.id,
          },
          { onConflict: "session_id,document_id" }
        );

      if (linkError && !isMissingDbObjectError(linkError)) {
        return NextResponse.json(
          { error: "Failed to link document to session" },
          { status: 500 }
        );
      }
    }

    try {
      await ingestDocument(document.id, user.id);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to ingest document";
      console.error("Upload ingest failure", {
        userId,
        documentId: document.id,
        storagePath,
        error: message,
      });

      const { error: failedStatusError } = await supabaseAdmin
        .from("documents")
        .update({ status: "failed" })
        .eq("id", document.id)
        .eq("user_id", userId);

      if (failedStatusError) {
        console.error("Upload ingest failure status update failed", {
          userId,
          documentId: document.id,
          error: failedStatusError.message,
        });
      }

      return NextResponse.json(
        {
          error: failedStatusError
            ? `Upload succeeded but ingest failed: ${message}. Failed to persist final status`
            : `Upload succeeded but ingest failed: ${message}. Document status set to failed`,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      documentId: document.id,
    });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 }
    );
  }
}
