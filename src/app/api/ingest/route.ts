import { NextRequest, NextResponse } from "next/server";
import { ingestDocument } from "@/lib/ingest-document";

export async function POST(req: NextRequest) {
  try {
    const { documentId } = await req.json();

    if (typeof documentId !== "string" || !documentId.trim()) {
      return NextResponse.json({ error: "Missing documentId" }, { status: 400 });
    }

    const { chunksCreated } = await ingestDocument(documentId);

    return NextResponse.json({
      success: true,
      chunksCreated,
    });
  } 
  
  catch (err) {
    console.error("Ingest error:", err);
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
