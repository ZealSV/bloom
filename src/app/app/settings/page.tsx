"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw, Unplug } from "lucide-react";
import CanvasSetupForm from "@/components/canvas/CanvasSetupForm";
import { useCanvasSync } from "@/hooks/useCanvasSync";

export default function SettingsPage() {
  const router = useRouter();
  const {
    status,
    loading,
    syncing,
    syncResult,
    error,
    checkCredentials,
    saveCredentials,
    removeCredentials,
    triggerSync,
  } = useCanvasSync();

  useEffect(() => {
    checkCredentials();
  }, [checkCredentials]);

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
        {/* Canvas LMS Section */}
        <section>
          <h2 className="font-outfit text-lg font-semibold text-foreground mb-1">
            Canvas LMS
          </h2>
          <p className="text-sm text-muted-foreground mb-4">
            Connect your Canvas account to automatically import courses and
            files into your buckets.
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

                {/* Sync result */}
                {syncResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1"
                  >
                    <p className="font-medium text-foreground">Sync complete</p>
                    <p className="text-muted-foreground">
                      {syncResult.coursesCreated} courses created,{" "}
                      {syncResult.coursesSkipped} skipped
                    </p>
                    <p className="text-muted-foreground">
                      {syncResult.filesUploaded} files uploaded,{" "}
                      {syncResult.filesIngested} ingested,{" "}
                      {syncResult.filesSkipped} skipped
                    </p>
                    {syncResult.errors.length > 0 && (
                      <p className="text-yellow-600">
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
                    onClick={triggerSync}
                    disabled={syncing}
                    className="h-9"
                  >
                    {syncing ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                        Syncing...
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
