"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Paperclip, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import Upload from "@/components/Upload";

export default function BucketsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center px-6 sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <Link href="/app">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="h-5 w-px bg-border" />
          <div className="flex items-center gap-2.5">
            <Image
              src="/bloomlogo.png"
              alt="bloom"
              width={22}
              height={22}
              className="rounded-md"
            />
            <h1 className="font-outfit font-semibold text-foreground">Buckets</h1>
          </div>
          <div className="h-5 w-px bg-border" />
        </div>
      </header>

      <div className="min-h-[calc(100vh-3.5rem)] px-6 py-8 flex items-center justify-center">
        <div className="w-full max-w-md space-y-4">
          <Button
            type="button"
            onClick={() => setIsUploadOpen(true)}
            className="w-full h-12 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
            title="Upload file"
          >
            <Paperclip className="h-4 w-4" />
            <span>Upload File</span>
          </Button>
          <Button
            type="button"
            className="w-full h-12 justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md hover:shadow-xl transition-all duration-200 active:shadow-md border border-emerald-400/20"
            title="Record lecture"
          >
            <Mic className="h-4 w-4" />
            <span>Record Lecture</span>
          </Button>
        </div>

        <Upload open={isUploadOpen} onOpenChange={setIsUploadOpen} />
      </div>
    </div>
  );
}
