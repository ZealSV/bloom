# Bloom — Full Documentation (Context + Codebase)

  ## 1) High‑Level Overview

  Bloom is a study companion built around the Feynman technique: the learner teaches a concept to Bloom,
  and Bloom responds as a curious student who asks simple but incisive questions. The goal is not to
  lecture, but to probe understanding, detect gaps, and help the learner clarify and improve.

  From the codebase, Bloom supports:

  - Live teaching sessions (chat or realtime voice).
  - Knowledge extraction (concepts, gaps, relationships, mastery).
  - Knowledge visualization (garden + concept graph).
  - Material ingestion (PDFs and lecture audio/video).
  - AI study artifacts (flashcards, practice exams, slide decks).

  This aligns directly with the project vision: “dump educational materials → build context and knowledge
  graph → study buddy via Feynman technique → live conversation with bloom.”

  ———

  ## 2) Product Philosophy (From Context + Prompting)

  Bloom’s behavior is encoded explicitly in the system prompt:

  - Bloom is a student, never a lecturer.
  - Bloom asks one question at a time.
  - Bloom probes vague or skipped reasoning.
  - Bloom occasionally makes a wrong inference to test understanding.
  - Bloom uses reference materials (RAG) as the primary source of truth.

  See: src/lib/ai-engine.ts

  The voice assistant uses the same principles, with shorter responses and audio‑appropriate constraints:

  - 1–2 sentences max.
  - No lists or markdown.
  - Simple, curious speech.

  See: src/lib/realtime-prompts.ts

  This operationalizes the third‑grader persona in code, while enforcing hidden rigor: the model must
  output structured JSON analysis to drive mastery tracking.

  ———

  ## 3) Core Experience: The Feynman Loop

  This is both product vision and implemented behavior.

  ### Loop (Conceptual)

  1. Student explains.
  2. Bloom asks “kid‑style” questions.
  3. Bloom surfaces gaps, misconceptions, skipped steps.
  4. Student refines.
  5. Bloom summarizes + identifies fuzzy spots.

  ### Loop (Implementation)

  - Chat streaming uses /api/sessions/[id]/chat.
  - The AI response is streamed text + a JSON analysis block.
  - The analysis updates:
      - concepts (mastery scores + status)
      - gaps (unresolved confusion)
      - concept relationships

  See:

  - src/app/api/sessions/[id]/chat/route.ts
  - src/lib/ai-engine.ts
  - src/hooks/useStreamingChat.ts
  - src/hooks/useSession.ts

  ———

  ## 4) Application Structure (Routes & UI)

  ### Primary Routes

  - /app → main teaching experience (Topic → Chat / Voice)
      - src/app/app/page.tsx
  - /app/dashboard → progress overview (Garden, Mastery, Concept Map)
      - src/app/app/dashboard/page.tsx
  - /app/buckets → subject grouping (create/manage buckets)
      - src/app/app/buckets/page.tsx
  - /app/buckets/[subjectId] → subject detail (lectures, flashcards, exams, slides, files)
      - src/app/app/buckets/[subjectId]/page.tsx

  ### Authentication

  - /auth/login, /auth/signup
      - src/app/auth/login/page.tsx
      - src/app/auth/signup/page.tsx

  ———

  ## 5) Topic Entry & Broad Topic Clarification

  When a user enters a topic, Bloom tries to detect if it’s too broad (e.g., “biology”). If broad, the UI
  shows a clarification step (subtopic, level, goal) before starting the session.

  Implementation:

  - UI: src/components/TopicPicker.tsx
  - Classifier API: src/app/api/topics/classify/route.ts
  - Storage: broad_topics table (DB‑stored list)

  Behavior:

  - If classified BROAD, Bloom prompts for a narrowed topic.
  - Broad topics get stored so the classifier can skip the API next time.

  ———

  ## 6) Teaching Sessions

  ### Chat Sessions

  - Stored in sessions, with messages, concepts, gaps, and concept_relationships.
  - Streaming SSE responses from the chat endpoint include:
      - text (incremental chat)
      - analysis (JSON)
      - done (final message + citations)

  Files:

  - src/app/api/sessions/[id]/chat/route.ts
  - src/hooks/useStreamingChat.ts

  ### Voice Sessions

  Two modes exist in code:

  1. In‑chat voice input (speech-to-text only):
      - Browser SpeechRecognition, toggled in Chat.
      - On final transcript, sends a chat message.
  2. Realtime voice session (OpenAI Realtime API):
      - Full audio input + audio output + transcripts
      - Dedicated “Live Voice Mode” UI

  Files:

  - src/components/Chat.tsx
  - src/hooks/useSpeechRecognition.ts
  - src/hooks/useRealtimeVoice.ts
  - src/components/LiveVoiceMode.tsx
  - src/app/api/realtime/session/route.ts

  ———

  ## 7) Knowledge Tracking & Visualization

  ### Concepts / Gaps / Relationships

  AI analysis is written to:

  - concepts table
  - gaps table
  - concept_relationships table

  Derived views:

  1. Knowledge Garden
      - Shows one flower per overarching topic, with subtopics as leaves.
      - Visual growth stage based on mastery score.
      - Includes tooltip details, subtopic counts.

  Files:

  - src/components/KnowledgeGarden.tsx
  - src/app/app/dashboard/page.tsx

  2. Mastery Dashboard
      - Overall mastery %
      - Per-session groups
      - Highlights unresolved gaps

  File:

  - src/components/MasteryDashboard.tsx

  3. Concept Graph
      - D3 force graph
      - Relationship types: requires, supports, example_of, contradicts
      - Zoom controls + legends

  File:

  - src/components/ConceptGraph.tsx

  ———

  ## 8) Content Ingestion (PDFs + Lectures)

  ### PDF Upload

  Flow:

  1. Upload file via /api/upload
  2. Store in Supabase storage (“learning materials” bucket)
  3. Create documents row
  4. Ingest -> chunk -> embed -> store in chunks

  Files:

  - src/app/api/upload/route.ts
  - src/app/api/ingest/route.ts
  - src/lib/ingest-document.ts

  Key details:

  - Chunk size: 800 chars, overlap 100
  - Embeddings: text-embedding-3-small
  - PDF text extraction uses pdf-parse with an explicit worker to avoid runtime issues.

  ### Lecture Recording / Transcription

  Two pathways:

  1. Live recording (microphone)
      - Chunks audio every 30–60 seconds
      - Each chunk transcribed by Whisper
      - Transcript is appended progressively
  2. Upload an audio/video file
      - File goes directly to Whisper
      - Transcript saved to lecture

  Files:

  - src/components/study/LectureRecorder.tsx
  - src/hooks/useLectureRecorder.ts
  - src/app/api/lectures/upload/route.ts
  - src/app/api/lectures/[id]/transcribe/route.ts

  ———

  ## 9) RAG / Retrieval

  Bloom supports lightweight RAG for:

  - Chat sessions
  - Voice sessions
  - Context building for flashcards/exams/slides

  Implementation:

  - retrieveRelevantChunks in src/lib/rag.ts
  - Uses text-embedding-3-small
  - RPC call: match_chunks_scoped (if available)
  - Fallback: fetch chunks and cosine similarity in JS
  - Produces contextText + citations

  Used in:

  - Chat (/api/sessions/[id]/chat)
  - Realtime voice (/api/realtime/session)

  ———

  ## 10) Study Artifacts (Flashcards, Exams, Slides)

  ### Flashcards

  - Generated from context aggregated by /api/study/context
  - Stored in flashcard_decks + flashcards
  - Supports spaced repetition stats (times_reviewed, times_correct, next_review_at)

  Files:

  - src/app/api/study/flashcards/route.ts
  - src/app/api/study/flashcards/[id]/route.ts
  - src/app/api/study/flashcards/[id]/review/route.ts
  - UI: src/components/study/FlashcardGenerator.tsx, FlashcardDeck.tsx

  ### Exams

  - Generated from aggregated context
  - Mixed question types
  - Graded by OpenAI for short answers
  - Attempts stored in exam_attempts

  Files:

  - src/app/api/study/exams/route.ts
  - src/app/api/study/exams/[id]/route.ts
  - src/app/api/study/exams/[id]/submit/route.ts
  - UI: src/components/study/ExamGenerator.tsx, ExamView.tsx

  ### Slides (Deep Feature)

  Slides are generated from bucket‑scoped context (PDFs + lectures).
  Decks can be previewed and exported to PPTX.

  Flow:

  1. /api/study/slides
      - Builds context
      - Calls OpenAI with SLIDE_DECK_PROMPT
      - Creates deck + slides
      - Generates images for up to 2 slides
  2. /api/study/slides/export
      - Converts slides to PPTX
      - Supports multiple templates and layouts

  Files:

  - src/app/api/study/slides/route.ts
  - src/app/api/study/slides/export/route.ts
  - src/lib/study-prompts.ts
  - UI: src/app/app/buckets/[subjectId]/page.tsx

  Slide Rendering Enhancements (from code):

  - Layout variety: split-visual, full-visual, title-overlay, image-left, image-right, captioned, etc.
  - Content‑aware image placement (definition → overlay, comparison → image‑left, etc.)
  - Slide “type” chips (Definition, Process, Comparison, Pitfall, Summary…)
  - Process slides render as timeline when ≤4 steps
  - Comparison slides render as two‑column blocks
  - Key terms strip for Definition slides

  This matches your requirement to make slides “next level.”

  ———

  ## 11) Buckets / Subjects (Organization)

  Buckets are “subjects” that group lectures, docs, and study artifacts.

  Capabilities:

  - Create/edit/delete subjects
  - Drag‑reorder cards (UI)
  - Each subject shows counts of lectures/decks/exams
  - Subject detail page includes:
      - Lectures
      - Flashcards
      - Exams
      - Slides
      - File uploads

  Files:

  - src/app/app/buckets/page.tsx
  - src/app/app/buckets/[subjectId]/page.tsx
  - src/components/study/SubjectCard.tsx
  - src/hooks/useSubjects.ts
  - src/app/api/subjects/route.ts

  ———

  ## 12) Auth & User Management

  Authentication is handled by Supabase Auth.

  In code:

  - Pages check supabase.auth.getUser() on load.
  - API routes validate authentication before any action.

  See:

  - src/app/app/page.tsx
  - src/app/api/* routes

  ———

  ## 13) Text‑to‑Speech

  Bloom can speak responses via TTS:

  - /api/tts uses OpenAI tts-1 with voice shimmer.
  - UI can toggle TTS on/off.
  - If TTS is disabled mid‑speak, playback stops immediately.

  Files:

  - src/app/api/tts/route.ts
  - src/hooks/useTextToSpeech.ts
  - src/components/Chat.tsx

  ———

  ## 14) Database‑Driven Scope & RAG Behavior

  Bucket scoping is explicit:

  - When generating flashcards/exams/slides in a bucket, only bucket documents & lectures are used.
  - When bucket‑scoped, session chat history is excluded from context.
  - This enforces correct source scope and avoids cross‑bucket leakage.

  See:

  - src/app/api/study/context/route.ts
  - src/components/study/SourceSelector.tsx
  - src/app/app/buckets/[subjectId]/page.tsx

  ———

  ## 15) API Surface (Summary)

  - Sessions:
      - POST /api/sessions
      - GET /api/sessions
      - GET /api/sessions/:id
      - DELETE /api/sessions/:id
      - POST /api/sessions/:id/chat
      - POST /api/sessions/:id/live-messages
  - Documents:
      - POST /api/upload
      - POST /api/ingest
  - Lectures:
      - GET /api/lectures
      - POST /api/lectures
      - POST /api/lectures/upload
      - POST /api/lectures/:id/transcribe
      - PATCH /api/lectures/:id
      - DELETE /api/lectures/:id
  - Study:
      - POST /api/study/context
      - POST /api/study/flashcards
      - GET /api/study/flashcards
      - POST /api/study/exams
      - GET /api/study/exams
      - POST /api/study/slides
      - GET /api/study/slides
      - DELETE /api/study/slides
      - POST /api/study/slides/export
  - Other:
      - POST /api/topics/classify
      - POST /api/realtime/session
      - POST /api/onboarding
      - PATCH /api/onboarding

  ———

  ## 16) UX & Visual Design (From Code)

  - Topic picker is animated and focused on quick start (with optional file upload).
  - Chat has:
      - mastery progress bar
      - streaming indicator
      - TTS status
      - voice labels (“Mic”, “TTS”)
  - Garden is a stylized SVG scene with animated blossoms, sky/ground gradients, stars, particles.
  - Concept map is fully interactive with D3, zoom and tooltips.
  - Buckets have flat, minimal subject cards with stats and drag handles.

  ———

  ## 17) Stack (Codebase‑Verified)

  - Next.js (App Router)
  - Supabase (Auth + Postgres + Storage)
  - pgvector (embeddings for RAG)
  - D3.js (knowledge graph visualization)
  - OpenAI (Chat, Whisper, Embeddings, TTS, Realtime)
  - Framer Motion (UI animations)
  - PptxGenJS (slide export)

  ———

  ## 18) Known Operational Details (from code)

  - Embeddings: text-embedding-3-small
  - Chat model: gpt-4o
  - Topic classifier: gpt-4o-mini
  - Whisper: whisper-1
  - TTS: tts-1
  - Realtime: gpt-4o-realtime-preview-2024-12-17
  - Slides images: gpt-image-1
      - max 2 per deck
      - only for visual slide types
      - size 1024x1024

  ———

  ## 19) Safety, Accuracy, and Learning Integrity

  From code + prompts:

  - Bloom avoids lecturing to prevent passive learning.
  - Reference material is prioritized over model knowledge.
  - If the teacher parrots text, mastery is penalized.
  - Mastery can’t exceed 70 on first explanation.
  - Broad topics trigger clarification to avoid misleading grading.

  ———

  ## 20) What’s Implemented vs. Conceptual

  ### Implemented (codebase)

  - Chat loop + mastery scoring
  - RAG retrieval
  - Lecture transcription
  - PDF ingestion + embeddings
  - Flashcards/exams/slides
  - Knowledge garden, mastery dashboard, concept map
  - Buckets/subjects

  ### Conceptual (documented vision)

  - Extended knowledge graph jobs (prereqs, misconceptions, study plan)
      - The graph exists; advanced behaviors are implied in prompts, not fully hard‑coded.

