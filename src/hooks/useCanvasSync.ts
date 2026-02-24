"use client";

import { useState, useCallback } from "react";

export interface SyncResult {
  success: boolean;
  coursesCreated: number;
  coursesSkipped: number;
  filesUploaded: number;
  filesSkipped: number;
  filesIngested: number;
  warnings: string[];
  errors: string[];
  duration: number;
}

export interface CanvasStatus {
  hasCredentials: boolean;
  canvasBaseUrl?: string;
  lastSyncAt?: string;
  lastSyncStatus?: string;
  lastSyncError?: string;
}

export interface CanvasCoursePreview {
  id: number;
  name: string;
  course_code: string;
  term: string | null;
  alreadySynced: boolean;
}

export function useCanvasSync() {
  const [status, setStatus] = useState<CanvasStatus>({
    hasCredentials: false,
  });
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [courses, setCourses] = useState<CanvasCoursePreview[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(false);

  const parseResponseBody = useCallback(async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        return await res.json();
      } catch {
        return null;
      }
    }
    try {
      const text = await res.text();
      if (!text) return null;
      const compact = text.replace(/\s+/g, " ").trim();
      return { error: compact.slice(0, 240) };
    } catch {
      return null;
    }
  }, []);

  const checkCredentials = useCallback(async () => {
    try {
      const res = await fetch("/api/canvas/credentials");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
      }
    } catch {
      // Ignore — credentials check is non-critical
    }
  }, []);

  const saveCredentials = useCallback(
    async (canvasBaseUrl: string, canvasApiToken: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/canvas/credentials", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ canvasBaseUrl, canvasApiToken }),
        });

        const data = await parseResponseBody(res);
        if (!res.ok) {
          setError(data?.error || "Failed to save credentials");
          return false;
        }

        setStatus({
          hasCredentials: true,
          canvasBaseUrl,
        });
        return true;
      } catch {
        setError("Network error. Please try again.");
        return false;
      } finally {
        setLoading(false);
      }
    },
    [parseResponseBody]
  );

  const removeCredentials = useCallback(async () => {
    setLoading(true);
    try {
      await fetch("/api/canvas/credentials", { method: "DELETE" });
      setStatus({ hasCredentials: false });
      setSyncResult(null);
      setCourses([]);
    } catch {
      setError("Failed to disconnect Canvas");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCourses = useCallback(async () => {
    setLoadingCourses(true);
    setError(null);
    try {
      const res = await fetch("/api/canvas/courses");
      const data = await parseResponseBody(res);
      if (!res.ok) {
        setError(data?.error || "Failed to fetch courses");
        return [];
      }
      const parsed = Array.isArray(data) ? (data as CanvasCoursePreview[]) : [];
      setCourses(parsed);
      return parsed;
    } catch {
      setError("Network error fetching courses");
      return [];
    } finally {
      setLoadingCourses(false);
    }
  }, [parseResponseBody]);

  const triggerSync = useCallback(
    async (courseIds?: number[]) => {
      setSyncing(true);
      setSyncResult(null);
      setError(null);
      try {
        const res = await fetch("/api/canvas/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseIds }),
        });
        const data = await parseResponseBody(res);
        if (!res.ok) {
          const rawError = data?.error || `Sync failed (${res.status})`;
          if (String(rawError).includes("403")) {
            setError(
              "Canvas denied access to some resources (403). This is usually a permissions or course access issue."
            );
          } else if (res.status >= 500 && !data?.error) {
            setError(
              "Sync failed due to a server issue. Please retry; large syncs may need multiple runs."
            );
          } else {
            setError(rawError);
          }
          return null;
        }
        if (!data) {
          setError("Unexpected sync response");
          return null;
        }
        setSyncResult(data);
        await checkCredentials(); // Refresh last_sync_at
        return data as SyncResult;
      } catch {
        setError("Network error during sync");
        return null;
      } finally {
        setSyncing(false);
      }
    },
    [checkCredentials, parseResponseBody]
  );

  return {
    status,
    loading,
    syncing,
    syncResult,
    error,
    courses,
    loadingCourses,
    checkCredentials,
    saveCredentials,
    removeCredentials,
    fetchCourses,
    triggerSync,
  };
}
