import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { getSupabaseAdmin } from "@/lib/supabase-admin";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const subjectId = req.nextUrl.searchParams.get("subject_id");

  const admin = getSupabaseAdmin();
  let query = admin
    .from("documents")
    .select("id, title, file_type, status, created_at, subject_id, canvas_file_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (subjectId) {
    query = query.eq("subject_id", subjectId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json(data || []);
}

export async function DELETE(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const documentId = req.nextUrl.searchParams.get("id");
  if (!documentId) {
    return NextResponse.json({ error: "Missing document id" }, { status: 400 });
  }

  const admin = getSupabaseAdmin();

  // Verify ownership
  const { data: doc } = await admin
    .from("documents")
    .select("id, file_path")
    .eq("id", documentId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!doc) {
    return NextResponse.json({ error: "Document not found" }, { status: 404 });
  }

  // Delete chunks first
  await admin.from("chunks").delete().eq("document_id", doc.id);

  // Delete from storage if file exists
  if (doc.file_path) {
    await admin.storage.from("learning materials").remove([doc.file_path]);
  }

  // Delete document record
  await admin.from("documents").delete().eq("id", doc.id);

  return NextResponse.json({ success: true });
}
