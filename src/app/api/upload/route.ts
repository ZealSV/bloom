import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createClient } from "@/lib/supabase-server";
import { userOwnsSession } from "@/lib/session-access";

const MATERIALS_BUCKET = "learning materials";

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

    if (!(fileValue instanceof File)) {
      return NextResponse.json({ error: "Missing file" }, { status: 400 });
    }

    const file = fileValue;
    const userId = user.id;
    const title =
      typeof titleValue === "string" && titleValue.trim()
        ? titleValue.trim()
        : file.name;

    const { data: document, error: insertError } = await supabaseAdmin
      .from("documents")
      .insert({
        user_id: userId,
        title,
        file_type: file.type,
        file_path: "",
        status: "uploaded",
        ...(subjectId ? { subject_id: subjectId } : {}),
      })
      .select()
      .single();

    if (insertError || !document) {
      return NextResponse.json(
        { error: "Failed to create document record" },
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
      return NextResponse.json(
        { error: "Failed to upload file to storage" },
        { status: 500 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from("documents")
      .update({ file_path: storagePath, status: "uploaded" })
      .eq("id", document.id);

    if (updateError) {
      return NextResponse.json(
        { error: "Failed to update file path" },
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
