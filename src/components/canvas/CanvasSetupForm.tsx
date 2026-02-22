"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface CanvasSetupFormProps {
  onSuccess?: () => void;
  saveCredentials: (
    canvasBaseUrl: string,
    canvasApiToken: string
  ) => Promise<boolean>;
  loading: boolean;
  error: string | null;
}

export default function CanvasSetupForm({
  onSuccess,
  saveCredentials,
  loading,
  error,
}: CanvasSetupFormProps) {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || !token.trim()) return;

    const success = await saveCredentials(url.trim(), token.trim());
    if (success) {
      setConnected(true);
      onSuccess?.();
    }
  };

  if (connected) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-3 py-4"
      >
        <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <CheckCircle2 className="h-5 w-5 text-emerald-500" />
        </div>
        <p className="text-sm font-medium text-foreground">
          Canvas connected successfully!
        </p>
        <p className="text-xs text-muted-foreground">
          Your courses will be synced to your buckets.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          Canvas Instance URL
        </label>
        <Input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://canvas.instructure.com"
          className="h-10"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted-foreground mb-1 block">
          API Access Token
        </label>
        <Input
          type="password"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          placeholder="Paste your Canvas API token"
          className="h-10"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowHelp(!showHelp)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronDown
          className={`h-3 w-3 transition-transform ${showHelp ? "rotate-180" : ""}`}
        />
        How to get your Canvas API token
      </button>

      <AnimatePresence>
        {showHelp && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1.5">
              <p>1. Log in to your Canvas LMS instance</p>
              <p>
                2. Go to <strong>Account</strong> &rarr;{" "}
                <strong>Settings</strong>
              </p>
              <p>
                3. Scroll to <strong>Approved Integrations</strong>
              </p>
              <p>
                4. Click <strong>+ New Access Token</strong>
              </p>
              <p>5. Give it a name (e.g. &quot;Bloom&quot;) and generate</p>
              <p>6. Copy the token and paste it above</p>
              <a
                href="https://community.canvaslms.com/t5/Student-Guide/How-do-I-manage-API-access-tokens-as-a-student/ta-p/273"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline mt-1"
              >
                Canvas help article
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <Button
        type="submit"
        disabled={!url.trim() || !token.trim() || loading}
        className="w-full h-10"
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing connection...
          </>
        ) : (
          "Connect Canvas"
        )}
      </Button>
    </form>
  );
}
