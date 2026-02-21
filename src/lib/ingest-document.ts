import { PDFParse } from "pdf-parse";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { openai } from "@/lib/openai";
import { supabaseAdmin } from "@/lib/supabase-admin";

const MATERIALS_BUCKET = "learning materials";
let workerConfigured = false;

function configurePdfWorker() {
  if (workerConfigured) {
    return;
  }

  const workerPath = join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.min.mjs"
  );
  const workerSource = readFileSync(workerPath, "utf-8");
  const workerDataUrl = `data:text/javascript;base64,${Buffer.from(
    workerSource
  ).toString("base64")}`;

  // Use a self-contained worker source to avoid runtime module resolution issues.
  PDFParse.setWorker(workerDataUrl);
  workerConfigured = true;
}

function chunkText(text: string, chunkSize = 800, overlap = 100) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = start + chunkSize;
    chunks.push(text.slice(start, end));
    start += chunkSize - overlap;
  }

  return chunks;
}

function toPgVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function formatSupabaseError(error: {
  message?: string;
  details?: string;
  hint?: string;
  code?: string;
}) {
  return [error.message, error.details, error.hint, error.code]
    .filter(Boolean)
    .join(" | ");
}

export async function ingestDocument(documentId: string) {
  const { data: document, error: docError } = await supabaseAdmin
    .from("documents")
    .select("user_id, file_path")
    .eq("id", documentId)
    .single();

  if (docError || !document) {
    const details = docError ? `: ${formatSupabaseError(docError)}` : "";
    throw new Error(`Document not found${details}`);
  }

  await supabaseAdmin
    .from("documents")
    .update({ status: "processing" })
    .eq("id", documentId);

  let parser: PDFParse | null = null;

  try {
    const { data: fileData, error: downloadError } = await supabaseAdmin.storage
      .from(MATERIALS_BUCKET)
      .download(document.file_path);

    if (downloadError || !fileData) {
      const details = downloadError?.message || "Unknown storage error";
      throw new Error(
        `Failed to download file: bucket=${MATERIALS_BUCKET} path=${document.file_path} details=${details}`
      );
    }

    const buffer = Buffer.from(await fileData.arrayBuffer());

    configurePdfWorker();
    parser = new PDFParse({ data: buffer });
    const { text: fullText } = await parser.getText();

    if (!fullText || fullText.length < 50) {
      throw new Error("PDF text extraction failed");
    }

    const chunks = chunkText(fullText);

    const embeddingResponse = await openai.embeddings.create({
      model: "text-embedding-3-small",
      input: chunks,
    });

    const embeddings = embeddingResponse.data.map((d) => d.embedding);

    const rows = chunks.map((content, i) => ({
      document_id: documentId,
      user_id: document.user_id,
      content,
      embedding: toPgVectorLiteral(embeddings[i]),
    }));

    const { error: insertError } = await supabaseAdmin.from("chunks").insert(rows);
    if (insertError) {
      const details = formatSupabaseError(insertError) || "Unknown insert error";
      throw new Error(`Failed to insert chunks: ${details}`);
    }

    await supabaseAdmin
      .from("documents")
      .update({ status: "ready" })
      .eq("id", documentId);

    return { chunksCreated: chunks.length };
  } catch (error) {
    await supabaseAdmin
      .from("documents")
      .update({ status: "failed" })
      .eq("id", documentId);
    throw error;
  } finally {
    if (parser) {
      await parser.destroy();
    }
  }
}
