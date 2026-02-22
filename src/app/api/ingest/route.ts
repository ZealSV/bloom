import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest-document";
import { createClient } from "@/lib/supabase-server";

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

    const { documentId } = await req.json();

    if (typeof documentId !== "string" || !documentId.trim()) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const { chunksCreated } = await ingestDocument(documentId, user.id);

    return NextResponse.json({
      success: true,
      chunksCreated,
    });
  } 
  
  catch (err) {
    console.error("Ingest error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    if (message.startsWith("Forbidden")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (message.startsWith("Document not found")) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
