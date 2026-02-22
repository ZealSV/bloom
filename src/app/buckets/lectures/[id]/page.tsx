"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import LectureView from "@/components/study/LectureView";
import type { Lecture } from "@/types/study";

export default function LectureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLecture = async () => {
    const res = await fetch(`/api/lectures/${id}`);
    if (res.ok) {
      const data = await res.json();
      setLecture(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLecture();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Loading lecture...</div>
      </div>
    );
  }

  if (!lecture) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-sm text-muted-foreground">Lecture not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-6 py-8">
        <LectureView
          lecture={lecture}
          onBack={() => router.push("/buckets")}
          onRefresh={fetchLecture}
        />
      </div>
    </div>
  );
}
