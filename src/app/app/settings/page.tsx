"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Loader2,
  RefreshCw,
  Unplug,
  Check,
  AlertTriangle,
} from "lucide-react";
import CanvasSetupForm from "@/components/canvas/CanvasSetupForm";
import { useCanvasSync, type CanvasCoursePreview } from "@/hooks/useCanvasSync";

export default function SettingsPage() {
  const router = useRouter();
  const {
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
  } = useCanvasSync();

  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [selectedCourseIds, setSelectedCourseIds] = useState<Set<number>>(
    new Set()
  );

  useEffect(() => {
    checkCredentials();
  }, [checkCredentials]);

  const handleSyncClick = async () => {
    const fetched = await fetchCourses();
    if (fetched.length > 0) {
      // Pre-select courses that aren't already synced
      const unsynced = fetched
        .filter((c: CanvasCoursePreview) => !c.alreadySynced)
        .map((c: CanvasCoursePreview) => c.id);
      setSelectedCourseIds(new Set(unsynced));
      setShowCoursePicker(true);
    }
  };

  const handleSyncSelected = async () => {
    setShowCoursePicker(false);
    const ids = Array.from(selectedCourseIds);
    await triggerSync(ids.length > 0 ? ids : undefined);
  };

  const toggleCourse = (id: number) => {
    setSelectedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedCourseIds(new Set(courses.map((c) => c.id)));
  };

  const selectNone = () => {
    setSelectedCourseIds(new Set());
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center gap-3">
          <button
            onClick={() => router.push("/app")}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <Image
            src="/bloomlogo.png"
            alt="bloom"
            width={24}
            height={24}
            className="rounded-md"
          />
          <h1 className="font-outfit font-semibold text-base">Settings</h1>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 space-y-8">
        {/* Canvas Section */}
        <section>
          <h2 className="font-outfit text-lg font-semibold text-foreground mb-1">
            Canvas LMS
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Canvas account to import courses and files into your
            buckets.
          </p>

          <div className="rounded-xl border border-border bg-card p-5">
            {status.hasCredentials ? (
              <div className="space-y-4">
                {/* Connection info */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      Connected
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {status.canvasBaseUrl}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {status.lastSyncStatus && (
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                          status.lastSyncStatus === "success"
                            ? "bg-emerald-500/10 text-emerald-600"
                            : status.lastSyncStatus === "partial"
                              ? "bg-yellow-500/10 text-yellow-600"
                              : "bg-red-500/10 text-red-600"
                        }`}
                      >
                        {status.lastSyncStatus}
                      </span>
                    )}
                  </div>
                </div>

                {status.lastSyncAt && (
                  <p className="text-xs text-muted-foreground">
                    Last synced:{" "}
                    {new Date(status.lastSyncAt).toLocaleString()}
                  </p>
                )}

                {/* Course Picker */}
                <AnimatePresence>
                  {showCoursePicker && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-foreground">
                            Select courses to sync
                          </p>
                          <div className="flex gap-2 text-xs">
                            <button
                              onClick={selectAll}
                              className="text-primary hover:underline"
                            >
                              All
                            </button>
                            <span className="text-muted-foreground">/</span>
                            <button
                              onClick={selectNone}
                              className="text-primary hover:underline"
                            >
                              None
                            </button>
                          </div>
                        </div>

                        <div className="space-y-1 max-h-64 overflow-y-auto">
                          {courses.map((course) => (
                            <label
                              key={course.id}
                              className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-muted/50 cursor-pointer transition-colors"
                            >
                              <input
                                type="checkbox"
                                checked={selectedCourseIds.has(course.id)}
                                onChange={() => toggleCourse(course.id)}
                                className="rounded border-border text-primary focus:ring-primary/20 h-4 w-4"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="text-sm text-foreground truncate">
                                  {course.name}
                                </p>
                                <p className="text-[11px] text-muted-foreground">
                                  {course.course_code}
                                  {course.term && ` · ${course.term}`}
                                  {course.alreadySynced && (
                                    <span className="ml-1 text-emerald-600">
                                      · synced
                                    </span>
                                  )}
                                </p>
                              </div>
                            </label>
                          ))}
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <Button
                            onClick={handleSyncSelected}
                            disabled={selectedCourseIds.size === 0}
                            size="sm"
                            className="h-8"
                          >
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                            Sync {selectedCourseIds.size} course
                            {selectedCourseIds.size !== 1 ? "s" : ""}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8"
                            onClick={() => setShowCoursePicker(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Sync result */}
                {syncResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1"
                  >
                    <p className="font-medium text-foreground flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      Sync complete
                    </p>
                    <p className="text-muted-foreground">
                      {syncResult.coursesCreated} courses created,{" "}
                      {syncResult.coursesSkipped} skipped
                    </p>
                    <p className="text-muted-foreground">
                      {syncResult.filesUploaded} files uploaded,{" "}
                      {syncResult.filesIngested} ingested,{" "}
                      {syncResult.filesSkipped} skipped
                    </p>
                    {syncResult.warnings && syncResult.warnings.length > 0 && (
                      <div className="text-yellow-600 space-y-0.5">
                        {syncResult.warnings.map((w: string, i: number) => (
                          <p key={i} className="flex items-start gap-1">
                            <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                            {w}
                          </p>
                        ))}
                      </div>
                    )}
                    {syncResult.errors.length > 0 && (
                      <p className="text-destructive">
                        {syncResult.errors.length} error(s) —{" "}
                        {syncResult.errors[0]}
                      </p>
                    )}
                    <p className="text-muted-foreground">
                      Took {(syncResult.duration / 1000).toFixed(1)}s
                    </p>
                  </motion.div>
                )}

                {error && <p className="text-xs text-destructive">{error}</p>}

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleSyncClick}
                    disabled={syncing || loadingCourses}
                    className="h-9"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Syncing...
                      </>
                    ) : loadingCourses ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Loading courses...
                      </>
                    ) : (
                      <>
                        <RefreshCw className="h-3.5 w-3.5 mr-2" />
                        Sync Now
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={removeCredentials}
                    disabled={loading || syncing}
                    className="h-9 text-destructive hover:text-destructive"
                  >
                    <Unplug className="h-3.5 w-3.5 mr-2" />
                    Disconnect
                  </Button>
                </div>
              </div>
            ) : (
              <CanvasSetupForm
                saveCredentials={saveCredentials}
                loading={loading}
                error={error}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
