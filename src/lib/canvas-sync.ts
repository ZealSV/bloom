import {
  listCourses,
  listCourseFiles,
  downloadFileContent,
  type CanvasCredentials,
  type CanvasCourse,
  type CanvasFile,
} from "./canvas-api";
import { getSupabaseAdmin } from "./supabase-admin";
import { ingestDocument } from "./ingest-document";

const MATERIALS_BUCKET = "learning materials";
const SUBJECT_COLORS = [
  "blue",
  "green",
  "purple",
  "orange",
  "pink",
  "cyan",
  "red",
  "yellow",
];

// Only PDFs can be chunked + embedded by the existing ingest pipeline
const INGESTIBLE_CONTENT_TYPES = new Set(["application/pdf"]);

// File types worth downloading and storing from Canvas
const UPLOADABLE_EXTENSIONS = new Set([
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "txt",
  "csv",
  "rtf",
  "odt",
  "odp",
  "ods",
]);

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

export interface SyncOptions {
  courseIds?: number[];
}

export async function syncCanvasContent(
  userId: string,
  creds: CanvasCredentials,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const startTime = Date.now();
  const admin = getSupabaseAdmin();
  const errors: string[] = [];
  const warnings: string[] = [];
  let coursesCreated = 0;
  let coursesSkipped = 0;
  let filesUploaded = 0;
  let filesSkipped = 0;
  let filesIngested = 0;

  // 1. Fetch courses from Canvas
  let courses: CanvasCourse[];
  try {
    courses = await listCourses(creds, { currentTermOnly: true });
  } catch {
    // Fall back to all courses if term filtering fails
    try {
      courses = await listCourses(creds, { currentTermOnly: false });
    } catch (e2) {
      return {
        success: false,
        coursesCreated: 0,
        coursesSkipped: 0,
        filesUploaded: 0,
        filesSkipped: 0,
        filesIngested: 0,
        warnings: [],
        errors: [`Failed to fetch courses: ${e2}`],
        duration: Date.now() - startTime,
      };
    }
  }

  // Filter to selected courses if specified
  if (options.courseIds && options.courseIds.length > 0) {
    const selectedSet = new Set(options.courseIds);
    courses = courses.filter((c) => selectedSet.has(c.id));
  }

  // 2. For each course, upsert a subject and sync files
  for (const course of courses) {
    try {
      // Check if subject with this canvas_course_id already exists
      const { data: existing } = await admin
        .from("subjects")
        .select("id")
        .eq("user_id", userId)
        .eq("canvas_course_id", course.id)
        .maybeSingle();

      let subjectId: string;

      if (existing) {
        subjectId = existing.id;
        coursesSkipped++;
      } else {
        const colorIndex =
          (coursesCreated + coursesSkipped) % SUBJECT_COLORS.length;
        const { data: newSubject, error: insertErr } = await admin
          .from("subjects")
          .insert({
            user_id: userId,
            name: course.name,
            color: SUBJECT_COLORS[colorIndex],
            canvas_course_id: course.id,
          })
          .select("id")
          .single();

        if (insertErr || !newSubject) {
          errors.push(
            `Failed to create subject for ${course.name}: ${insertErr?.message}`
          );
          continue;
        }
        subjectId = newSubject.id;
        coursesCreated++;
      }

      // 3. Fetch files for this course
      // listCourseFiles tries /files first, falls back to modules on 403
      let files: CanvasFile[];
      try {
        files = await listCourseFiles(creds, course.id);
      } catch {
        warnings.push(
          `[${course.course_code}] Could not fetch files — skipped`
        );
        continue;
      }

      // 4. For each file, download + upload + ingest PDFs
      for (const file of files) {
        try {
          // Skip file types we don't need (videos, images, archives, etc.)
          const ext = (file.filename.split(".").pop() || "").toLowerCase();
          if (!UPLOADABLE_EXTENSIONS.has(ext)) {
            continue;
          }

          // Dedup: skip only if a doc with this canvas_file_id was actually uploaded
          const { data: existingDoc } = await admin
            .from("documents")
            .select("id, file_path")
            .eq("user_id", userId)
            .eq("canvas_file_id", file.id)
            .maybeSingle();

          if (existingDoc && existingDoc.file_path) {
            filesSkipped++;
            continue;
          }

          // Clean up orphaned record from a failed previous sync
          if (existingDoc && !existingDoc.file_path) {
            await admin.from("documents").delete().eq("id", existingDoc.id);
          }

          // Download from Canvas
          const downloadUrl = file.download_url ?? file.url;
          const buffer = await downloadFileContent(creds, downloadUrl);

          // Create document record
          const fileExt = file.filename.split(".").pop() || "pdf";
          const canIngest = INGESTIBLE_CONTENT_TYPES.has(file.content_type);
          const { data: doc, error: docErr } = await admin
            .from("documents")
            .insert({
              user_id: userId,
              title: file.display_name,
              file_type: file.content_type,
              file_path: "",
              status: canIngest ? "uploaded" : "ready",
              subject_id: subjectId,
              canvas_file_id: file.id,
            })
            .select("id")
            .single();

          if (docErr || !doc) {
            errors.push(
              `[${course.course_code}] Failed to create doc for ${file.display_name}: ${docErr?.message}`
            );
            continue;
          }

          // Upload to Supabase Storage
          const storagePath = `${userId}/${doc.id}/original.${fileExt}`;
          const { error: uploadErr } = await admin.storage
            .from(MATERIALS_BUCKET)
            .upload(storagePath, buffer, {
              contentType: file.content_type,
              upsert: true,
            });

          if (uploadErr) {
            errors.push(
              `[${course.course_code}] Storage upload failed for ${file.display_name}: ${uploadErr.message}`
            );
            continue;
          }

          // Update file_path
          await admin
            .from("documents")
            .update({ file_path: storagePath })
            .eq("id", doc.id);

          filesUploaded++;

          // Ingest (chunking + embedding) — only for PDFs
          if (canIngest) {
            try {
              await ingestDocument(doc.id);
              filesIngested++;
            } catch (e) {
              warnings.push(
                `[${course.course_code}] Ingest failed for ${file.display_name}: ${e}`
              );
            }
          }
        } catch (e) {
          errors.push(
            `[${course.course_code}] Error processing ${file.display_name}: ${e}`
          );
        }
      }
    } catch (e) {
      errors.push(`Error syncing ${course.name}: ${e}`);
    }
  }

  // 5. Update sync metadata
  const hasRealErrors = errors.length > 0;
  await admin
    .from("canvas_credentials")
    .update({
      last_sync_at: new Date().toISOString(),
      last_sync_status: hasRealErrors ? "partial" : "success",
      last_sync_error: hasRealErrors
        ? errors.join("; ").slice(0, 2000)
        : null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  return {
    success: !hasRealErrors,
    coursesCreated,
    coursesSkipped,
    filesUploaded,
    filesSkipped,
    filesIngested,
    warnings,
    errors,
    duration: Date.now() - startTime,
  };
}
