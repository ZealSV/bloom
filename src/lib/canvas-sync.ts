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
const MAX_CANVAS_FILE_BYTES = 50 * 1024 * 1024;
const MAX_SYNC_RUNTIME_MS = 52000;
const MAX_FILES_PER_SYNC = 250;
const MIN_INGEST_BUDGET_MS = 10000;
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
  let filesProcessed = 0;
  let stoppedEarly = false;
  let stopReason = "";

  const shouldStopEarly = () => {
    if (Date.now() - startTime > MAX_SYNC_RUNTIME_MS) {
      stoppedEarly = true;
      stopReason = `Sync paused early to avoid timeout. Re-run sync to continue.`;
      return true;
    }
    if (filesProcessed >= MAX_FILES_PER_SYNC) {
      stoppedEarly = true;
      stopReason = `Sync paused after ${MAX_FILES_PER_SYNC} files to keep this run stable. Re-run sync to continue.`;
      return true;
    }
    return false;
  };

  // 1. Fetch courses from Canvas
  let courses: CanvasCourse[];
  try {
    courses = await listCourses(creds, { currentTermOnly: true });
  } catch (e) {
    console.warn("[canvas-sync] Failed to fetch current-term courses, falling back to all terms.", {
      userId,
      error: String(e),
    });
    // Fall back to all courses if term filtering fails
    try {
      courses = await listCourses(creds, { currentTermOnly: false });
    } catch (e2) {
      console.error("[canvas-sync] Failed to fetch any Canvas courses.", {
        userId,
        error: String(e2),
      });
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

  let fatalAuthError = false;

  // 2. For each course, upsert a subject and sync files
  for (const course of courses) {
    if (shouldStopEarly()) break;
    if (fatalAuthError) break;

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
          console.error("[canvas-sync] Failed to create subject.", {
            userId,
            courseId: course.id,
            courseCode: course.course_code,
            error: insertErr?.message,
          });
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
      } catch (e: any) {
        const status = Number(e?.status || 0);
        if (status === 401) {
          fatalAuthError = true;
          console.error("[canvas-sync] Canvas credentials rejected while fetching files.", {
            userId,
            courseId: course.id,
            courseCode: course.course_code,
          });
          errors.push("Canvas credentials rejected (401). Reconnect Canvas.");
          break;
        }
        warnings.push(
          `[${course.course_code}] Could not fetch files — skipped (${status || "unknown"})`
        );
        console.warn("[canvas-sync] Failed to list course files.", {
          userId,
          courseId: course.id,
          courseCode: course.course_code,
          status,
          error: String(e),
        });
        continue;
      }

      // 4. For each file, download + upload + ingest PDFs
      for (const file of files) {
        if (shouldStopEarly()) break;
        if (fatalAuthError) break;
        filesProcessed++;

        try {
          // Skip file types we don't need (videos, images, archives, etc.)
          const ext = (file.filename.split(".").pop() || "").toLowerCase();
          if (!UPLOADABLE_EXTENSIONS.has(ext)) {
            continue;
          }
          if (file.locked_for_user || file.hidden_for_user) {
            warnings.push(
              `[${course.course_code}] File locked or hidden: ${file.display_name}`
            );
            continue;
          }
          if (file.size > MAX_CANVAS_FILE_BYTES) {
            warnings.push(
              `[${course.course_code}] File too large to sync (${Math.round(
                file.size / (1024 * 1024)
              )}MB): ${file.display_name}`
            );
            continue;
          }

          // Dedup: skip only if a doc with this canvas_file_id was actually uploaded
          const { data: existingDoc } = await admin
            .from("documents")
            .select("id, file_path, subject_id")
            .eq("user_id", userId)
            .eq("canvas_file_id", file.id)
            .maybeSingle();

          if (existingDoc && existingDoc.file_path) {
            if (existingDoc.subject_id !== subjectId) {
              await admin
                .from("documents")
                .update({ subject_id: subjectId })
                .eq("id", existingDoc.id);
            }
            filesSkipped++;
            continue;
          }

          // Clean up orphaned record from a failed previous sync
          if (existingDoc && !existingDoc.file_path) {
            await admin.from("documents").delete().eq("id", existingDoc.id);
          }

          // Download from Canvas
          const downloadUrl = file.download_url ?? file.url;
          let buffer: Buffer;
          try {
            buffer = await downloadFileContent(creds, downloadUrl);
          } catch (e: any) {
            const status = Number(e?.status || 0);
            if (status === 401) {
              fatalAuthError = true;
              errors.push("Canvas credentials rejected (401). Reconnect Canvas.");
              console.error("[canvas-sync] Canvas credentials rejected while downloading file.", {
                userId,
                courseId: course.id,
                courseCode: course.course_code,
                fileId: file.id,
                fileName: file.display_name,
              });
              break;
            }
            if (status === 403) {
              warnings.push(
                `[${course.course_code}] Access denied for ${file.display_name} (403)`
              );
              continue;
            }
            if (status === 404) {
              warnings.push(
                `[${course.course_code}] File missing in Canvas: ${file.display_name} (404)`
              );
              continue;
            }
            if (status === 429) {
              warnings.push(
                `[${course.course_code}] Rate limited while downloading ${file.display_name} (429)`
              );
              continue;
            }
            throw e;
          }

          if (fatalAuthError) break;

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
            console.error("[canvas-sync] Failed to create document row.", {
              userId,
              courseId: course.id,
              courseCode: course.course_code,
              fileId: file.id,
              fileName: file.display_name,
              error: docErr?.message,
            });
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
            console.error("[canvas-sync] Storage upload failed.", {
              userId,
              courseId: course.id,
              courseCode: course.course_code,
              fileId: file.id,
              fileName: file.display_name,
              error: uploadErr.message,
            });
            await admin.from("documents").delete().eq("id", doc.id);
            errors.push(
              `[${course.course_code}] Storage upload failed for ${file.display_name}: ${uploadErr.message}`
            );
            continue;
          }

          // Update file_path
          const { error: updateDocErr } = await admin
            .from("documents")
            .update({ file_path: storagePath })
            .eq("id", doc.id);

          if (updateDocErr) {
            console.error("[canvas-sync] Failed to update document file_path.", {
              userId,
              documentId: doc.id,
              fileName: file.display_name,
              error: updateDocErr.message,
            });
            errors.push(
              `[${course.course_code}] Failed to finalize ${file.display_name}: ${updateDocErr.message}`
            );
            continue;
          }

          filesUploaded++;

          // Ingest (chunking + embedding) — only for PDFs
          if (canIngest) {
            const remainingMs = MAX_SYNC_RUNTIME_MS - (Date.now() - startTime);
            if (remainingMs < MIN_INGEST_BUDGET_MS) {
              warnings.push(
                `[${course.course_code}] Skipped ingest for ${file.display_name} in this run due to time budget`
              );
              continue;
            }
            try {
              await ingestDocument(doc.id);
              filesIngested++;
            } catch (e) {
              console.warn("[canvas-sync] Ingest failed.", {
                userId,
                documentId: doc.id,
                fileName: file.display_name,
                error: String(e),
              });
              warnings.push(
                `[${course.course_code}] Ingest failed for ${file.display_name}: ${e}`
              );
            }
          }
        } catch (e) {
          console.error("[canvas-sync] Unexpected file processing failure.", {
            userId,
            courseId: course.id,
            courseCode: course.course_code,
            fileId: file.id,
            fileName: file.display_name,
            error: String(e),
          });
          errors.push(
            `[${course.course_code}] Error processing ${file.display_name}: ${e}`
          );
        }
      }
    } catch (e) {
      console.error("[canvas-sync] Unexpected course sync failure.", {
        userId,
        courseId: course.id,
        courseCode: course.course_code,
        error: String(e),
      });
      errors.push(`Error syncing ${course.name}: ${e}`);
    }
  }

  if (stoppedEarly && stopReason) {
    warnings.push(stopReason);
    console.warn("[canvas-sync] Stopped early.", {
      userId,
      reason: stopReason,
      filesProcessed,
      durationMs: Date.now() - startTime,
    });
  }

  // 5. Update sync metadata
  const hasRealErrors = errors.length > 0 || stoppedEarly;
  const { error: syncMetaErr } = await admin
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

  if (syncMetaErr) {
    console.error("[canvas-sync] Failed to update sync metadata.", {
      userId,
      error: syncMetaErr.message,
    });
  }

  return {
    success: errors.length === 0 && !stoppedEarly,
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
