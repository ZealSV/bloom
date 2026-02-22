import type { SupabaseClient } from "@supabase/supabase-js";
import { openai } from "@/lib/openai";
import type { Database } from "@/lib/database.types";

export interface RagCitation {
  chunkId: number | null;
  documentId: string;
  documentTitle: string;
  snippet: string;
  score: number;
}

export interface RagRetrievalResult {
  contextText: string;
  citations: RagCitation[];
}

interface RetrieveChunksOptions {
  supabase: SupabaseClient<Database>;
  userId: string;
  query: string;
  sessionId?: string;
  matchCount?: number;
  matchThreshold?: number;
}

type ChunkRow = {
  id?: number;
  document_id: string;
  content: string;
  embedding?: unknown;
  similarity?: number;
};

function toPgVectorLiteral(values: number[]) {
  return `[${values.join(",")}]`;
}

function parseEmbeddingValue(value: unknown): number[] | null {
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

function isMissingDbObjectError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const code = error.code || "";
  const message = (error.message || "").toLowerCase();
  return (
    code === "42P01" ||
    code === "42883" ||
    code === "PGRST202" ||
    code === "PGRST205" ||
    message.includes("does not exist") ||
    message.includes("not found in the schema cache")
  );
}

async function getSessionDocumentIds(
  supabase: SupabaseClient<Database>,
  sessionId?: string
): Promise<string[] | null> {
  if (!sessionId) return null;

  const sb = supabase as any;
  const { data, error } = await sb
    .from("session_documents")
    .select("document_id")
    .eq("session_id", sessionId);

  if (error) {
    if (isMissingDbObjectError(error)) return null;
    throw new Error(`Failed to load session documents: ${error.message}`);
  }

  return Array.isArray(data)
    ? data.map((row: { document_id: string }) => row.document_id).filter(Boolean)
    : [];
}

async function getDocumentTitleMap(
  supabase: SupabaseClient<Database>,
  documentIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (documentIds.length === 0) return map;

  const sb = supabase as any;
  const { data } = await sb
    .from("documents")
    .select("id, title")
    .in("id", documentIds);

  if (Array.isArray(data)) {
    for (const row of data) {
      if (row?.id) {
        map.set(row.id, row.title || `Document ${row.id}`);
      }
    }
  }

  return map;
}

async function retrieveViaRpc(
  supabase: SupabaseClient<Database>,
  params: {
    queryEmbedding: number[];
    userId: string;
    documentIds: string[] | null;
    matchCount: number;
    matchThreshold: number;
  }
): Promise<ChunkRow[] | null> {
  const sb = supabase as any;
  const payload: Record<string, unknown> = {
    query_embedding: toPgVectorLiteral(params.queryEmbedding),
    match_count: params.matchCount,
    match_threshold: params.matchThreshold,
    p_user_id: params.userId,
    p_document_ids: params.documentIds && params.documentIds.length > 0
      ? params.documentIds
      : null,
  };

  const { data, error } = await sb.rpc("match_chunks_scoped", payload);
  if (error) {
    if (isMissingDbObjectError(error)) return null;
    throw new Error(`RAG RPC failed: ${error.message}`);
  }

  return Array.isArray(data) ? (data as ChunkRow[]) : [];
}

async function retrieveViaFallback(
  supabase: SupabaseClient<Database>,
  params: {
    queryEmbedding: number[];
    userId: string;
    documentIds: string[] | null;
    matchCount: number;
    matchThreshold: number;
  }
): Promise<ChunkRow[]> {
  const sb = supabase as any;
  let query = sb
    .from("chunks")
    .select("id, document_id, content, embedding")
    .eq("user_id", params.userId)
    .limit(1200);

  if (params.documentIds && params.documentIds.length > 0) {
    query = query.in("document_id", params.documentIds);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`RAG fallback query failed: ${error.message}`);
  }

  const rows = Array.isArray(data) ? (data as ChunkRow[]) : [];
  const scored: ChunkRow[] = [];

  for (const row of rows) {
    const embedding = parseEmbeddingValue(row.embedding);
    if (!embedding) continue;
    const similarity = cosineSimilarity(params.queryEmbedding, embedding);
    if (similarity >= params.matchThreshold) {
      scored.push({ ...row, similarity });
    }
  }

  scored.sort((a, b) => (b.similarity || 0) - (a.similarity || 0));
  return scored.slice(0, params.matchCount);
}

export async function retrieveRelevantChunks({
  supabase,
  userId,
  query,
  sessionId,
  matchCount = 8,
  matchThreshold = 0.2,
}: RetrieveChunksOptions): Promise<RagRetrievalResult> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery || !process.env.OPENAI_API_KEY) {
    return { contextText: "", citations: [] };
  }

  const embeddingResponse = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: trimmedQuery,
  });
  const queryEmbedding = embeddingResponse.data[0]?.embedding;
  if (!queryEmbedding) {
    return { contextText: "", citations: [] };
  }

  const documentIds = await getSessionDocumentIds(supabase, sessionId);

  const rpcRows = await retrieveViaRpc(supabase, {
    queryEmbedding,
    userId,
    documentIds,
    matchCount: matchCount * 3,
    matchThreshold,
  });

  const rows = rpcRows ?? await retrieveViaFallback(supabase, {
    queryEmbedding,
    userId,
    documentIds,
    matchCount: matchCount * 3,
    matchThreshold,
  });

  if (!rows.length) {
    return { contextText: "", citations: [] };
  }

  const topRows = rows
    .slice()
    .sort((a, b) => (b.similarity || 0) - (a.similarity || 0))
    .slice(0, matchCount)
    .filter((row) => (row.similarity || 0) >= Math.max(matchThreshold, 0.25));

  const titleMap = await getDocumentTitleMap(
    supabase,
    topRows.map((r) => r.document_id)
  );

  const citations: RagCitation[] = topRows.map((row) => ({
    chunkId: Number.isFinite(row.id) ? Number(row.id) : null,
    documentId: row.document_id,
    documentTitle: titleMap.get(row.document_id) || `Document ${row.document_id}`,
    snippet: row.content.slice(0, 220).trim(),
    score: Number((row.similarity || 0).toFixed(4)),
  }));

  if (citations.length === 0) {
    return { contextText: "", citations: [] };
  }

  const contextText = topRows
    .map((row, i) => {
      const title = titleMap.get(row.document_id) || `Document ${row.document_id}`;
      const score = Number((row.similarity || 0).toFixed(4));
      const chunkLabel = row.id ?? "n/a";
      return `[SOURCE ${i + 1} | ${title} | chunk:${chunkLabel} | similarity:${score}]\n${row.content.slice(0, 1400)}`;
    })
    .join("\n\n");

  return { contextText, citations };
}
