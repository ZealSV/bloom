// ---- Subject types ----

export interface Subject {
  id: string;
  user_id: string;
  name: string;
  color: string | null;
  canvas_course_id?: number | null;
  created_at: string;
  lecture_count?: number;
  deck_count?: number;
  exam_count?: number;
}

// ---- Lecture types ----

export interface LectureSummary {
  title: string;
  keyPoints: string[];
  sections: {
    heading: string;
    content: string;
  }[];
  keyTerms: {
    term: string;
    definition: string;
  }[];
}

export interface Lecture {
  id: string;
  user_id: string;
  title: string;
  transcript: string;
  summary: LectureSummary | null;
  status: "recording" | "processing" | "ready" | "failed";
  duration_seconds: number;
  subject_id: string | null;
  created_at: string;
  updated_at: string;
}

// ---- Flashcard types ----

export type FlashcardDifficulty = "easy" | "medium" | "hard";

export interface Flashcard {
  id: string;
  deck_id: string;
  front: string;
  back: string;
  difficulty: FlashcardDifficulty;
  times_reviewed: number;
  times_correct: number;
  next_review_at: string | null;
  created_at: string;
}

export interface FlashcardDeck {
  id: string;
  user_id: string;
  title: string;
  source_type: SourceType;
  source_ids: string[];
  card_count: number;
  subject_id: string | null;
  created_at: string;
}

// ---- Exam types ----

export type QuestionType = "multiple_choice" | "short_answer" | "true_false";

export interface ExamQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

export interface PracticeExam {
  id: string;
  user_id: string;
  title: string;
  questions: ExamQuestion[];
  source_type: SourceType;
  source_ids: string[];
  subject_id: string | null;
  created_at: string;
}

// ---- Slide types ----

export interface Slide {
  id: string;
  deck_id: string;
  slide_index: number;
  title: string;
  bullets: string[];
  speaker_notes: string;
  image_url?: string | null;
  layout?: string | null;
  hero_bullet?: string | null;
  created_at: string;
}

export interface SlideDeck {
  id: string;
  user_id: string;
  subject_id: string | null;
  title: string;
  slide_count: number;
  template?: string | null;
  created_at: string;
}

export interface ExamAttempt {
  id: string;
  exam_id: string;
  user_id: string;
  answers: Record<string, string>;
  score: number | null;
  feedback: Record<string, { correct: boolean; explanation: string }> | null;
  completed_at: string;
}

// ---- Shared types ----

export type SourceType = "lecture" | "document" | "session" | "all" | "none";

export interface StudySource {
  id: string;
  type: SourceType;
  title: string;
  createdAt: string;
}
