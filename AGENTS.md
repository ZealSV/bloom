# Bloom Audit Fix Plan (8 Agents)

This file defines 8 independent agents, each owning one issue from the audit.
Each agent must stay in their owned scope and avoid touching files assigned to others unless explicitly noted.

## Global Rules
- Keep changes minimal and production-safe.
- Add server-side logging at failure points you touch.
- Preserve existing API shapes unless listed otherwise.
- Add/update tests if test harness exists for changed area.
- Run `npx tsc --noEmit` before handoff.

---

## Agent 1 - Route-Level Ownership Enforcement
**Issue:** Potential IDOR on `/:id` routes relying only on auth + implicit RLS.

**Owns:**
- `src/app/api/subjects/[id]/route.ts`
- `src/app/api/lectures/[id]/route.ts`
- `src/app/api/study/flashcards/[id]/route.ts`
- `src/app/api/study/exams/[id]/route.ts`

**Task:**
- Enforce object ownership in each handler with explicit user checks.
- For read/update/delete, scope by `user_id` (or verify owner via parent table).
- Return `404` for non-owned resources to avoid leakage.

**Acceptance:**
- No operation by `id` executes without ownership enforcement.
- Existing frontend calls continue to work unchanged.

---

## Agent 2 - Secure Upload Subject Validation
**Issue:** `/api/upload` trusts client-provided `subjectId` while using service-role writes.

**Owns:**
- `src/app/api/upload/route.ts`

**Task:**
- Validate `subjectId` belongs to authenticated user before insert.
- Reject invalid or foreign `subjectId` with `403` or `404`.
- Keep optional `subjectId` behavior.

**Acceptance:**
- Cross-user `subjectId` cannot be attached in upload flow.
- Session linking behavior remains intact.

---

## Agent 3 - Upload Consistency + Cleanup
**Issue:** Upload/ingest failures can leave orphaned document records or inconsistent states.

**Owns:**
- `src/app/api/upload/route.ts`
- (Optional helper) `src/lib/ingest-document.ts` if needed

**Task:**
- Add robust cleanup logic for every failure stage:
  - storage upload failure
  - DB update failure
  - ingest failure
- Ensure final status is consistent (`uploaded`/`ready`/`failed`) and recoverable.

**Acceptance:**
- No orphan rows with empty `file_path` after failures.
- Failure responses describe what succeeded vs failed.

---

## Agent 4 - Upload Resource Limits
**Issue:** No server-side PDF size cap in `/api/upload`.

**Owns:**
- `src/app/api/upload/route.ts`

**Task:**
- Add strict max file size validation before buffering.
- Return clear `400` with max size message.
- Keep MIME + extension checks aligned.

**Acceptance:**
- Oversized uploads are rejected before memory-heavy operations.

---

## Agent 5 - Context Aggregation Performance Refactor
**Issue:** N+1 queries in `/api/study/context` may timeout on larger datasets.

**Owns:**
- `src/app/api/study/context/route.ts`

**Task:**
- Replace per-document and per-session loops with batched queries.
- Use `in(...)` for chunk/message fetches, then group in memory.
- Preserve output format and stats.

**Acceptance:**
- Same response shape.
- Fewer total DB round trips for non-trivial datasets.

---

## Agent 6 - Chat/Live Write Error Handling
**Issue:** Message/concept/gap/relationship writes ignore DB errors.

**Owns:**
- `src/app/api/sessions/[id]/chat/route.ts`
- `src/app/api/sessions/[id]/live-messages/route.ts`

**Task:**
- Check and handle insert/update errors throughout.
- Log failures with session/user context.
- Ensure stream still returns controlled error events when appropriate.

**Acceptance:**
- No silent DB write failures.
- Client receives deterministic error behavior.

---

## Agent 7 - TTS Resilience
**Issue:** `/api/tts` lacks robust provider error handling.

**Owns:**
- `src/app/api/tts/route.ts`

**Task:**
- Wrap OpenAI call in try/catch and normalize failure responses.
- Add structured logging with safe metadata.
- Keep successful response streaming behavior unchanged.

**Acceptance:**
- Provider/network errors return explicit HTTP errors.
- No unhandled throw path.

---

## Agent 8 - Tooling/CI Lint Reliability
**Issue:** `npm run lint` is not behaving reliably in current setup.

**Owns:**
- `package.json`
- ESLint/Next config files as needed (`.eslintrc*`, `next.config.*`)

**Task:**
- Fix lint script so local/CI lint runs deterministically.
- Document exact lint command in README if changed.

**Acceptance:**
- `npm run lint` executes valid lint workflow from repo root.

---

## Integration Order
1. Agent 1, 2, 4, 7 can merge early (low coupling).
2. Agent 3 should rebase on Agent 2 + 4 changes in upload route.
3. Agent 6 should merge before any UI error-message tuning.
4. Agent 5 can merge independently.
5. Agent 8 last (or early if CI needed immediately).

## Final Gate
- `npx tsc --noEmit`
- `npm run lint`
- Smoke test:
  - Canvas sync
  - Upload PDF
  - Generate flashcards/exam
  - Start chat + live session
