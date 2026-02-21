"use client";

import { useEffect, useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface UploadProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload?: (file: File) => void | Promise<void>;
}

export default function Upload({ open, onOpenChange, onUpload }: UploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsUploading(false);
      setErrorMessage(null);
    }
  }, [open]);

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      await onUpload?.(file);
      onOpenChange(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload file.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Upload a file</DialogTitle>
          <DialogDescription>
            Add a document to extract knowledge from.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <label
            htmlFor="topic-upload"
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:border-primary/30"
          >
            <UploadCloud className="mb-2 h-5 w-5 text-muted-foreground" />
            <p className="text-sm text-foreground">Choose a file to upload</p>
            <p className="text-xs text-muted-foreground mt-1">
              PDF
            </p>
          </label>

          <input
            id="topic-upload"
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />

          {file && (
            <div className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-foreground truncate">{file.name}</p>
            </div>
          )}

          {errorMessage && (
            <p className="text-sm text-destructive">{errorMessage}</p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleUpload}
            disabled={!file || isUploading}
          >
            {isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
