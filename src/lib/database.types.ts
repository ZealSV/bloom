export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      sessions: {
        Row: {
          id: string;
          user_id: string;
          topic: string;
          subject_area: string | null;
          created_at: string;
          updated_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          topic: string;
          subject_area?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          topic?: string;
          subject_area?: string | null;
          updated_at?: string;
          status?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: number;
          session_id: string;
          role: string;
          content: string;
          created_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          role: string;
          content: string;
          created_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          content?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "messages_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      concepts: {
        Row: {
          id: number;
          session_id: string;
          name: string;
          mastery_score: number;
          status: string;
          parent_concept: string | null;
          updated_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          name: string;
          mastery_score?: number;
          status?: string;
          parent_concept?: string | null;
          updated_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          name?: string;
          mastery_score?: number;
          status?: string;
          parent_concept?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "concepts_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      gaps: {
        Row: {
          id: number;
          session_id: string;
          concept_name: string;
          description: string | null;
          resolved: boolean;
          detected_at: string;
        };
        Insert: {
          id?: number;
          session_id: string;
          concept_name: string;
          description?: string | null;
          resolved?: boolean;
          detected_at?: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          concept_name?: string;
          description?: string | null;
          resolved?: boolean;
          detected_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gaps_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      concept_relationships: {
        Row: {
          id: number;
          session_id: string;
          from_concept: string;
          to_concept: string;
          relationship: string;
          reasoning: string | null;
        };
        Insert: {
          id?: number;
          session_id: string;
          from_concept: string;
          to_concept: string;
          relationship: string;
          reasoning?: string | null;
        };
        Update: {
          id?: number;
          session_id?: string;
          from_concept?: string;
          to_concept?: string;
          relationship?: string;
          reasoning?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "concept_relationships_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "sessions";
            referencedColumns: ["id"];
          }
        ];
      };
      subjects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          color: string | null;
          canvas_course_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          color?: string | null;
          canvas_course_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          color?: string | null;
          canvas_course_id?: number | null;
        };
        Relationships: [];
      };
      canvas_credentials: {
        Row: {
          user_id: string;
          canvas_base_url: string;
          canvas_api_token_encrypted: string;
          last_sync_at: string | null;
          last_sync_status: string | null;
          last_sync_error: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          canvas_base_url: string;
          canvas_api_token_encrypted: string;
          last_sync_at?: string | null;
          last_sync_status?: string | null;
          last_sync_error?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          canvas_base_url?: string;
          canvas_api_token_encrypted?: string;
          last_sync_at?: string | null;
          last_sync_status?: string | null;
          last_sync_error?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_onboarding: {
        Row: {
          user_id: string;
          onboarding_completed: boolean;
        };
        Insert: {
          user_id: string;
          onboarding_completed?: boolean;
        };
        Update: {
          user_id?: string;
          onboarding_completed?: boolean;
        };
        Relationships: [];
      };
      lectures: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          transcript: string;
          summary: Json | null;
          status: string;
          duration_seconds: number;
          subject_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string;
          transcript?: string;
          summary?: Json | null;
          status?: string;
          duration_seconds?: number;
          subject_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          transcript?: string;
          summary?: Json | null;
          status?: string;
          duration_seconds?: number;
          subject_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "lectures_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      flashcard_decks: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          source_type: string;
          source_ids: string[];
          card_count: number;
          subject_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          source_type?: string;
          source_ids?: string[];
          card_count?: number;
          subject_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          source_type?: string;
          source_ids?: string[];
          card_count?: number;
          subject_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "flashcard_decks_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      flashcards: {
        Row: {
          id: string;
          deck_id: string;
          front: string;
          back: string;
          difficulty: string;
          times_reviewed: number;
          times_correct: number;
          next_review_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          front: string;
          back: string;
          difficulty?: string;
          times_reviewed?: number;
          times_correct?: number;
          next_review_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deck_id?: string;
          front?: string;
          back?: string;
          difficulty?: string;
          times_reviewed?: number;
          times_correct?: number;
          next_review_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "flashcards_deck_id_fkey";
            columns: ["deck_id"];
            isOneToOne: false;
            referencedRelation: "flashcard_decks";
            referencedColumns: ["id"];
          }
        ];
      };
      practice_exams: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          questions: Json;
          source_type: string;
          source_ids: string[];
          subject_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          questions?: Json;
          source_type?: string;
          source_ids?: string[];
          subject_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          questions?: Json;
          source_type?: string;
          source_ids?: string[];
          subject_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "practice_exams_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      exam_attempts: {
        Row: {
          id: string;
          exam_id: string;
          user_id: string;
          answers: Json;
          score: number | null;
          feedback: Json | null;
          completed_at: string;
        };
        Insert: {
          id?: string;
          exam_id: string;
          user_id: string;
          answers?: Json;
          score?: number | null;
          feedback?: Json | null;
          completed_at?: string;
        };
        Update: {
          id?: string;
          exam_id?: string;
          user_id?: string;
          answers?: Json;
          score?: number | null;
          feedback?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: "exam_attempts_exam_id_fkey";
            columns: ["exam_id"];
            isOneToOne: false;
            referencedRelation: "practice_exams";
            referencedColumns: ["id"];
          }
        ];
      };
      documents: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          file_type: string;
          file_path: string;
          status: string;
          subject_id: string | null;
          canvas_file_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          file_type: string;
          file_path?: string;
          status?: string;
          subject_id?: string | null;
          canvas_file_id?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          file_type?: string;
          file_path?: string;
          status?: string;
          subject_id?: string | null;
          canvas_file_id?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      slide_decks: {
        Row: {
          id: string;
          user_id: string;
          subject_id: string | null;
          title: string;
          slide_count: number;
          template: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          subject_id?: string | null;
          title: string;
          slide_count?: number;
          template?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          subject_id?: string | null;
          title?: string;
          slide_count?: number;
          template?: string;
        };
        Relationships: [
          {
            foreignKeyName: "slide_decks_subject_id_fkey";
            columns: ["subject_id"];
            isOneToOne: false;
            referencedRelation: "subjects";
            referencedColumns: ["id"];
          }
        ];
      };
      slides: {
        Row: {
          id: string;
          deck_id: string;
          slide_index: number;
          title: string;
          bullets: string[];
          speaker_notes: string;
          image_url: string | null;
          layout: string;
          hero_bullet: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          deck_id: string;
          slide_index: number;
          title: string;
          bullets?: string[];
          speaker_notes?: string;
          image_url?: string | null;
          layout?: string;
          hero_bullet?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          deck_id?: string;
          slide_index?: number;
          title?: string;
          bullets?: string[];
          speaker_notes?: string;
          image_url?: string | null;
          layout?: string;
          hero_bullet?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "slides_deck_id_fkey";
            columns: ["deck_id"];
            isOneToOne: false;
            referencedRelation: "slide_decks";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};
