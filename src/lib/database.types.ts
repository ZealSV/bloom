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
          topic: string;
          subject_area: string | null;
          created_at: string;
          updated_at: string;
          status: string;
        };
        Insert: {
          id?: string;
          topic: string;
          subject_area?: string | null;
          created_at?: string;
          updated_at?: string;
          status?: string;
        };
        Update: {
          id?: string;
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
        };
        Insert: {
          id?: number;
          session_id: string;
          from_concept: string;
          to_concept: string;
          relationship: string;
        };
        Update: {
          id?: number;
          session_id?: string;
          from_concept?: string;
          to_concept?: string;
          relationship?: string;
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
