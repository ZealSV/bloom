/**
 * Canvas API client — per-user credentials, server-side only.
 * Adapted from /repos/yucca/src/lib/canvas-api.ts
 */

const CANVAS_PAGE_SIZE = 100;

export interface CanvasCredentials {
  token: string;
  baseUrl: string; // e.g. "https://canvas.instructure.com/api/v1"
}

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  enrollment_term_id?: number;
  workflow_state: string;
  start_at?: string;
  end_at?: string;
  term?: {
    id: number;
    name: string;
    start_at: string | null;
    end_at: string | null;
  };
}

export interface CanvasFile {
  id: number;
  display_name: string;
  filename: string;
  url: string;
  download_url?: string;
  size: number;
  content_type: string;
  created_at: string;
  updated_at: string;
}

interface CanvasModuleItem {
  id: number;
  type: string;
  title: string;
  content_id?: number;
  url?: string;
}

class CanvasAPIError extends Error {
  constructor(
    message: string,
    public status: number,
    public endpoint: string,
  ) {
    super(message);
    this.name = "CanvasAPIError";
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  let url = baseUrl.trim().replace(/\/+$/, "");
  if (!url.endsWith("/api/v1")) {
    url = url + "/api/v1";
  }
  return url;
}

async function canvasRequest<T>(
  creds: CanvasCredentials,
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const base = normalizeBaseUrl(creds.baseUrl);
  const url = `${base}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${creds.token}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new CanvasAPIError(
      `Canvas API error: ${response.status} ${response.statusText}`,
      response.status,
      endpoint,
    );
  }

  return response.json();
}

async function canvasRequestPaginated<T>(
  creds: CanvasCredentials,
  endpoint: string,
): Promise<T[]> {
  const base = normalizeBaseUrl(creds.baseUrl);
  const results: T[] = [];
  let url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}per_page=${CANVAS_PAGE_SIZE}`;

  while (url) {
    const fullUrl = url.startsWith("http") ? url : `${base}${url}`;
    const response = await fetch(fullUrl, {
      headers: {
        Authorization: `Bearer ${creds.token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      throw new CanvasAPIError(
        `Canvas API error: ${response.status} ${response.statusText}`,
        response.status,
        url,
      );
    }

    const data = await response.json();
    results.push(...(Array.isArray(data) ? data : [data]));

    const linkHeader = response.headers.get("Link");
    const nextMatch = linkHeader?.match(/<([^>]+)>;\s*rel="next"/);
    if (nextMatch) {
      const nextUrl = new URL(nextMatch[1]);
      url = nextUrl.pathname + nextUrl.search;
    } else {
      url = "";
    }
  }

  return results;
}

export async function validateCredentials(
  creds: CanvasCredentials,
): Promise<boolean> {
  try {
    await canvasRequest(creds, "/users/self");
    return true;
  } catch {
    return false;
  }
}

export async function listCourses(
  creds: CanvasCredentials,
  options: { currentTermOnly?: boolean } = {},
): Promise<CanvasCourse[]> {
  const { currentTermOnly = true } = options;

  const courses = await canvasRequestPaginated<CanvasCourse>(
    creds,
    "/courses?enrollment_state=active&include[]=term",
  );

  if (!currentTermOnly) return courses;

  const now = new Date();
  return courses.filter((course) => {
    if (!course.term) return false;
    const start = course.term.start_at
      ? new Date(course.term.start_at)
      : new Date(0);
    const end = course.term.end_at
      ? new Date(course.term.end_at)
      : new Date("2100-01-01");
    return now >= start && now <= end;
  });
}

/**
 * Try direct /files endpoint first. If 403 (instructor disabled Files tab),
 * fall back to collecting files from course modules.
 */
export async function listCourseFiles(
  creds: CanvasCredentials,
  courseId: number,
): Promise<CanvasFile[]> {
  // Try direct file listing first
  try {
    return await canvasRequestPaginated<CanvasFile>(
      creds,
      `/courses/${courseId}/files`,
    );
  } catch (e: any) {
    if (e?.status !== 403) throw e;
    // Fall through to module-based approach
  }

  // Fallback: get files via modules → module items → batch file details
  const seenFileIds = new Set<number>();
  const fileContentIds: number[] = [];

  try {
    const modules = await canvasRequestPaginated<{ id: number }>(
      creds,
      `/courses/${courseId}/modules`,
    );

    // Fetch all module items in parallel (one request per module)
    const itemResults = await Promise.allSettled(
      modules.map((mod) =>
        canvasRequestPaginated<CanvasModuleItem>(
          creds,
          `/courses/${courseId}/modules/${mod.id}/items`,
        )
      )
    );

    for (const result of itemResults) {
      if (result.status !== "fulfilled") continue;
      for (const item of result.value) {
        if (item.type !== "File" || !item.content_id) continue;
        if (seenFileIds.has(item.content_id)) continue;
        seenFileIds.add(item.content_id);
        fileContentIds.push(item.content_id);
      }
    }
  } catch {
    // Modules endpoint failed — course truly restricts everything
    return [];
  }

  // Fetch file details in parallel batches of 10
  const files: CanvasFile[] = [];
  const BATCH_SIZE = 10;

  for (let i = 0; i < fileContentIds.length; i += BATCH_SIZE) {
    const batch = fileContentIds.slice(i, i + BATCH_SIZE);
    const results = await Promise.allSettled(
      batch.map((id) =>
        canvasRequest<CanvasFile>(
          creds,
          `/courses/${courseId}/files/${id}`,
        )
      )
    );
    for (const result of results) {
      if (result.status === "fulfilled") {
        files.push(result.value);
      }
    }
  }

  return files;
}

export async function downloadFileContent(
  creds: CanvasCredentials,
  downloadUrl: string,
): Promise<Buffer> {
  const headers: HeadersInit = {};
  if (downloadUrl.includes("/api/v1/")) {
    headers.Authorization = `Bearer ${creds.token}`;
  }
  const response = await fetch(downloadUrl, { headers });
  if (!response.ok) {
    throw new Error(`Failed to download file: ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
