export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      questions: {
        Row: {
          correct_answers: Json
          created_at: string
          id: string
          image_url: string | null
          options: Json
          order_index: number
          points: number
          question_text: string
          question_type: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          time_limit: number
        }
        Insert: {
          correct_answers?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number
          points?: number
          question_text: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id: string
          time_limit?: number
        }
        Update: {
          correct_answers?: Json
          created_at?: string
          id?: string
          image_url?: string | null
          options?: Json
          order_index?: number
          points?: number
          question_text?: string
          question_type?: Database["public"]["Enums"]["question_type"]
          quiz_id?: string
          time_limit?: number
        }
        Relationships: [
          {
            foreignKeyName: "questions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_completions: {
        Row: {
          completed_at: string
          host_id: string
          id: string
          leaderboard: Json
          participant_count: number
          quiz_id: string
          quiz_title: string
          session_id: string
        }
        Insert: {
          completed_at?: string
          host_id: string
          id?: string
          leaderboard?: Json
          participant_count?: number
          quiz_id: string
          quiz_title: string
          session_id: string
        }
        Update: {
          completed_at?: string
          host_id?: string
          id?: string
          leaderboard?: Json
          participant_count?: number
          quiz_id?: string
          quiz_title?: string
          session_id?: string
        }
        Relationships: []
      }
      quiz_participants: {
        Row: {
          avatar_emoji: string | null
          best_streak: number
          current_streak: number
          id: string
          joined_at: string
          nickname: string
          session_id: string
          total_score: number
          user_id: string | null
        }
        Insert: {
          avatar_emoji?: string | null
          best_streak?: number
          current_streak?: number
          id?: string
          joined_at?: string
          nickname: string
          session_id: string
          total_score?: number
          user_id?: string | null
        }
        Update: {
          avatar_emoji?: string | null
          best_streak?: number
          current_streak?: number
          id?: string
          joined_at?: string
          nickname?: string
          session_id?: string
          total_score?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quiz_participants_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_responses: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          participant_id: string
          points_earned: number
          question_id: string
          response_time_ms: number | null
          selected_answers: Json
          session_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          participant_id: string
          points_earned?: number
          question_id: string
          response_time_ms?: number | null
          selected_answers?: Json
          session_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          participant_id?: string
          points_earned?: number
          question_id?: string
          response_time_ms?: number | null
          selected_answers?: Json
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_responses_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "quiz_participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "quiz_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_sessions: {
        Row: {
          created_at: string
          current_question_index: number | null
          ended_at: string | null
          host_id: string
          id: string
          mode: Database["public"]["Enums"]["session_mode"]
          pin_code: string
          quiz_id: string
          show_leaderboard: boolean
          started_at: string | null
          status: Database["public"]["Enums"]["session_status"]
        }
        Insert: {
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          host_id: string
          id?: string
          mode?: Database["public"]["Enums"]["session_mode"]
          pin_code: string
          quiz_id: string
          show_leaderboard?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
        }
        Update: {
          created_at?: string
          current_question_index?: number | null
          ended_at?: string | null
          host_id?: string
          id?: string
          mode?: Database["public"]["Enums"]["session_mode"]
          pin_code?: string
          quiz_id?: string
          show_leaderboard?: boolean
          started_at?: string | null
          status?: Database["public"]["Enums"]["session_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quiz_sessions_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          category: Database["public"]["Enums"]["quiz_category"]
          cover_image_url: string | null
          created_at: string
          creator_id: string
          default_time_per_question: number
          description: string | null
          id: string
          is_public: boolean
          play_count: number
          title: string
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["quiz_category"]
          cover_image_url?: string | null
          created_at?: string
          creator_id: string
          default_time_per_question?: number
          description?: string | null
          id?: string
          is_public?: boolean
          play_count?: number
          title: string
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["quiz_category"]
          cover_image_url?: string | null
          created_at?: string
          creator_id?: string
          default_time_per_question?: number
          description?: string | null
          id?: string
          is_public?: boolean
          play_count?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      question_type:
      | "multiple_choice_single"
      | "multiple_choice_multiple"
      | "true_false"
      quiz_category:
      | "art_literature"
      | "entertainment"
      | "geography"
      | "history"
      | "science_nature"
      | "sports"
      | "languages"
      | "trivia"
      | "technology"
      | "other"
      session_mode: "live_hosted" | "self_paced"
      session_status:
      | "waiting"
      | "active"
      | "paused"
      | "completed"
      | "cancelled"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
  | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
    DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
  ? R
  : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
    DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] &
    DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
  ? R
  : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Insert: infer I
  }
  ? I
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Insert: infer I
  }
  ? I
  : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
  | keyof DefaultSchema["Tables"]
  | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
  : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
    Update: infer U
  }
  ? U
  : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
    Update: infer U
  }
  ? U
  : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
  | keyof DefaultSchema["Enums"]
  | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
  : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
  | keyof DefaultSchema["CompositeTypes"]
  | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
  ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
  : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      question_type: [
        "multiple_choice_single",
        "multiple_choice_multiple",
        "true_false",
      ],
      quiz_category: [
        "art_literature",
        "entertainment",
        "geography",
        "history",
        "science_nature",
        "sports",
        "languages",
        "trivia",
        "technology",
        "other",
      ],
      session_mode: ["live_hosted", "self_paced"],
      session_status: ["waiting", "active", "paused", "completed", "cancelled"],
    },
  },
} as const