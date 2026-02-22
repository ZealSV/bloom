"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Plus, FolderOpen, Flower, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import SubjectCard from "@/components/study/SubjectCard";
import DelelteConfirm from "@/components/delelteConfirm";
import { useSubjects } from "@/hooks/useSubjects";
import { createClient } from "@/lib/supabase-browser";
import type { Subject } from "@/types/study";

const SUBJECT_COLORS = [
  { name: "blue", class: "bg-blue-500" },
  { name: "green", class: "bg-green-500" },
  { name: "purple", class: "bg-purple-500" },
  { name: "orange", class: "bg-orange-500" },
  { name: "pink", class: "bg-pink-500" },
  { name: "cyan", class: "bg-cyan-500" },
  { name: "red", class: "bg-red-500" },
  { name: "yellow", class: "bg-yellow-500" },
];

function SubjectCardSkeleton() {
  return (
    <div className="rounded-2xl border border-border/50 bg-muted/20 overflow-hidden">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <Skeleton className="w-3 h-3 rounded-full" />
        </div>
        <Skeleton className="h-6 w-36 mb-2" />
        <Skeleton className="h-3.5 w-20 mb-5" />
        <div className="flex items-center gap-3">
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
          <Skeleton className="h-7 w-14 rounded-lg" />
        </div>
      </div>
    </div>
  );
}

function SortableSubjectCard({
  subject,
  onClick,
  onDelete,
  onEdit,
}: {
  subject: Subject;
  onClick: () => void;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subject.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 10 : undefined,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <SubjectCard
        subject={subject}
        onClick={onClick}
        onDelete={onDelete}
        onEdit={onEdit}
        dragHandle={
          <button
            className="cursor-grab active:cursor-grabbing text-muted-foreground/40 hover:text-muted-foreground transition-colors touch-none"
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-4 w-4" />
          </button>
        }
      />
    </div>
  );
}

export default function BucketsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [newName, setNewName] = useState("");
  const [selectedColor, setSelectedColor] = useState("blue");
  const [creating, setCreating] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [subjectToDelete, setSubjectToDelete] = useState<Subject | null>(null);

  const supabase = useMemo(() => createClient(), []);
  const { subjects, fetchSubjects, createSubject, deleteSubject, updateSubject, setSubjects } =
    useSubjects();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/auth/login");
        return;
      }
      await fetchSubjects();
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    const subject = await createSubject(newName.trim(), selectedColor);
    setCreating(false);
    if (subject) {
      setDialogOpen(false);
      setNewName("");
      setSelectedColor("blue");
    }
  };

  const handleEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setNewName(subject.name);
    setSelectedColor(subject.color || "blue");
    setEditDialogOpen(true);
  };

  const handleEditSave = async () => {
    if (!editingSubject || !newName.trim()) return;
    await updateSubject(editingSubject.id, {
      name: newName.trim(),
      color: selectedColor,
    });
    setEditDialogOpen(false);
    setEditingSubject(null);
    setNewName("");
  };

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = subjects.findIndex((s) => s.id === active.id);
      const newIndex = subjects.findIndex((s) => s.id === over.id);
      if (oldIndex !== -1 && newIndex !== -1) {
        setSubjects(arrayMove(subjects, oldIndex, newIndex));
      }
    },
    [subjects, setSubjects]
  );

  const handleRequestDelete = (subject: Subject) => {
    setSubjectToDelete(subject);
    setDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!subjectToDelete) return;
    await deleteSubject(subjectToDelete.id);
    setDeleteConfirmOpen(false);
    setSubjectToDelete(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="h-14 border-b border-border bg-card/80 backdrop-blur-sm flex items-center justify-between px-6 sticky top-0 z-10">
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
            <h1 className="font-outfit font-semibold text-foreground">
              Buckets
            </h1>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              New Subject
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="font-outfit">Create Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <Input
                placeholder="e.g. Biology, Computer Science..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                }}
                autoFocus
              />
              <div>
                <p className="text-xs text-muted-foreground mb-2">Color</p>
                <div className="flex gap-2">
                  {SUBJECT_COLORS.map((c) => (
                    <button
                      key={c.name}
                      onClick={() => setSelectedColor(c.name)}
                      className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                        selectedColor === c.name
                          ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                          : "opacity-60 hover:opacity-100"
                      }`}
                    />
                  ))}
                </div>
              </div>
              <Button
                onClick={handleCreate}
                disabled={!newName.trim() || creating}
                className="w-full"
              >
                {creating ? "Creating..." : "Create Subject"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Edit Subject Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-outfit">Edit Subject</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              placeholder="Subject name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleEditSave();
              }}
              autoFocus
            />
            <div>
              <p className="text-xs text-muted-foreground mb-2">Color</p>
              <div className="flex gap-2">
                {SUBJECT_COLORS.map((c) => (
                  <button
                    key={c.name}
                    onClick={() => setSelectedColor(c.name)}
                    className={`w-7 h-7 rounded-full ${c.class} transition-all ${
                      selectedColor === c.name
                        ? "ring-2 ring-offset-2 ring-offset-background ring-primary scale-110"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  />
                ))}
              </div>
            </div>
            <Button
              onClick={handleEditSave}
              disabled={!newName.trim()}
              className="w-full"
            >
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SubjectCardSkeleton key={i} />
            ))}
          </div>
        ) : subjects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary/5 border border-primary/10 mb-5">
              <FolderOpen className="h-9 w-9 text-primary/40" />
            </div>
            <h2 className="font-outfit text-xl font-semibold text-foreground mb-2">
              No subjects yet
            </h2>
            <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
              Create a subject to organize your lectures, flashcards, and practice exams all in one place.
            </p>
            <Button size="lg" onClick={() => setDialogOpen(true)}>
              <Flower className="mr-2 h-4 w-4" />
              Create Your First Subject
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {subjects.length} {subjects.length === 1 ? "subject" : "subjects"}
              </p>
            </div>
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={subjects.map((s) => s.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {subjects.map((subject) => (
                    <SortableSubjectCard
                      key={subject.id}
                      subject={subject}
                      onClick={() => router.push(`/app/buckets/${subject.id}`)}
                      onDelete={() => handleRequestDelete(subject)}
                      onEdit={() => handleEdit(subject)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </motion.div>
        )}
      </div>

      <DelelteConfirm
        open={deleteConfirmOpen}
        onOpenChange={(open) => {
          setDeleteConfirmOpen(open);
          if (!open) setSubjectToDelete(null);
        }}
        onYes={handleConfirmDelete}
      />
    </div>
  );
}
