"use client";

import { useEffect, useId, useRef, useState } from "react";
import { UploadCloud, FileText, X, CheckCircle2 } from "lucide-react";
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
  onUploadComplete?: (fileName: string) => void;
  sessionId?: string | null;
}

export default function Upload({
  open,
  onOpenChange,
  onUploadComplete,
  sessionId,
}: UploadProps) {
  const inputId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSucceeded, setUploadSucceeded] = useState(false);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!open) {
      setFile(null);
      setIsUploading(false);
      setUploadSucceeded(false);
      setIsDragActive(false);
      setErrorMessage(null);
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
        closeTimerRef.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  const readApiResponse = async (response: Response) => {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      return response.json();
    }

    const text = await response.text();
    if (text.includes("<!DOCTYPE html>")) {
      return { error: "Server returned an HTML error page" };
    }

    return {
      error: text.slice(0, 300) || "Server returned a non-JSON response.",
    };
  };

  const handleUpload = async () => {
    if (!file) {
      return;
    }

    setErrorMessage(null);
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", file.name);
      if (sessionId) {
        formData.append("sessionId", sessionId);
      }

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const uploadResult = await readApiResponse(uploadResponse);

      if (!uploadResponse.ok) {
        throw new Error(
          (uploadResult as { error?: string })?.error ||
            `Upload failed (${uploadResponse.status})`,
        );
      }

      const documentId = uploadResult?.documentId;
      if (typeof documentId !== "string" || !documentId) {
        throw new Error("Upload succeeded but no documentId was returned.");
      }

      const ingestResponse = await fetch("/api/ingest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ documentId }),
      });

      const ingestResult = await readApiResponse(ingestResponse);

      if (!ingestResponse.ok) {
        throw new Error(
          (ingestResult as { error?: string })?.error ||
            `Ingest failed (${ingestResponse.status})`,
        );
      }

      setUploadSucceeded(true);
      onUploadComplete?.(file.name);
      closeTimerRef.current = setTimeout(() => {
        onOpenChange(false);
      }, 900);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload file.";
      setErrorMessage(message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearFile = () => {
    if (isUploading) {
      return;
    }
    setFile(null);
    setUploadSucceeded(false);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const isPdf = (candidate: File) =>
    candidate.type === "application/pdf" ||
    candidate.name.toLowerCase().endsWith(".pdf");

  const handleFileSelect = (selected: File | null) => {
    if (!selected) {
      return;
    }

    if (!isPdf(selected)) {
      setErrorMessage("Please upload a PDF file.");
      setFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      return;
    }

    setErrorMessage(null);
    setUploadSucceeded(false);
    setFile(selected);
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    handleFileSelect(e.dataTransfer.files?.[0] ?? null);
  };

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
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
          {!file && (
            <label
              htmlFor={inputId}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed bg-muted/30 p-6 text-center transition-colors ${
                isDragActive
                  ? "border-primary/50 bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <UploadCloud className="mb-2 h-5 w-5 text-muted-foreground" />
              <p className="text-sm text-foreground">Choose a file to upload</p>
              <p className="text-xs text-muted-foreground mt-1">
                Drag and drop a PDF, or click to browse
              </p>
            </label>
          )}

          <input
            id={inputId}
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf"
            onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
          />

          {file && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-border bg-card px-3 py-2">
              <div className="min-w-0 flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                <p className="text-sm text-foreground truncate">{file.name}</p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground"
                onClick={handleClearFile}
                disabled={isUploading}
                title="Remove file"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {uploadSucceeded && (
            <div className="flex items-center gap-2 rounded-md border border-primary/30 bg-primary/10 px-3 py-2">
              <CheckCircle2 className="h-4 w-4 text-primary" />
              <p className="text-sm text-foreground">Uploaded and indexed.</p>
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
            disabled={!file || isUploading || uploadSucceeded}
          >
            {uploadSucceeded ? "Done" : isUploading ? "Uploading..." : "Upload"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
