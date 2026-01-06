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
      avatar_sessions: {
        Row: {
          avatar_provider: string | null
          created_at: string | null
          id: string
          interview_session_id: string | null
          session_data: Json | null
        }
        Insert: {
          avatar_provider?: string | null
          created_at?: string | null
          id?: string
          interview_session_id?: string | null
          session_data?: Json | null
        }
        Update: {
          avatar_provider?: string | null
          created_at?: string | null
          id?: string
          interview_session_id?: string | null
          session_data?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "avatar_sessions_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      evaluations: {
        Row: {
          communication_score: number | null
          confidence_score: number | null
          created_at: string | null
          feedback: string | null
          id: string
          interview_id: string
          overall_score: number | null
          technical_score: number | null
          user_id: string
        }
        Insert: {
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          interview_id: string
          overall_score?: number | null
          technical_score?: number | null
          user_id: string
        }
        Update: {
          communication_score?: number | null
          confidence_score?: number | null
          created_at?: string | null
          feedback?: string | null
          id?: string
          interview_id?: string
          overall_score?: number | null
          technical_score?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: true
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      improvement_suggestions: {
        Row: {
          category: string | null
          created_at: string | null
          evaluation_id: string
          id: string
          priority: number | null
          suggestion: string
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          evaluation_id: string
          id?: string
          priority?: number | null
          suggestion: string
        }
        Update: {
          category?: string | null
          created_at?: string | null
          evaluation_id?: string
          id?: string
          priority?: number | null
          suggestion?: string
        }
        Relationships: [
          {
            foreignKeyName: "improvement_suggestions_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          created_at: string | null
          duration_seconds: number | null
          end_time: string | null
          id: string
          interview_id: string
          start_time: string | null
          vapi_session_id: string | null
        }
        Insert: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          interview_id: string
          start_time?: string | null
          vapi_session_id?: string | null
        }
        Update: {
          created_at?: string | null
          duration_seconds?: number | null
          end_time?: string | null
          id?: string
          interview_id?: string
          start_time?: string | null
          vapi_session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_interview_id_fkey"
            columns: ["interview_id"]
            isOneToOne: false
            referencedRelation: "interviews"
            referencedColumns: ["id"]
          },
        ]
      }
      interviews: {
        Row: {
          created_at: string | null
          duration: Database["public"]["Enums"]["interview_duration"]
          ended_at: string | null
          id: string
          resume_id: string | null
          scheduled_at: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["interview_status"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          duration?: Database["public"]["Enums"]["interview_duration"]
          ended_at?: string | null
          id?: string
          resume_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          duration?: Database["public"]["Enums"]["interview_duration"]
          ended_at?: string | null
          id?: string
          resume_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["interview_status"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "interviews_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          camera_permission: boolean | null
          created_at: string | null
          email: string
          full_name: string | null
          id: string
          microphone_permission: boolean | null
          university_code_id: string | null
          university_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          camera_permission?: boolean | null
          created_at?: string | null
          email: string
          full_name?: string | null
          id?: string
          microphone_permission?: boolean | null
          university_code_id?: string | null
          university_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          camera_permission?: boolean | null
          created_at?: string | null
          email?: string
          full_name?: string | null
          id?: string
          microphone_permission?: boolean | null
          university_code_id?: string | null
          university_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_university_code_id_fkey"
            columns: ["university_code_id"]
            isOneToOne: false
            referencedRelation: "university_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_university_id_fkey"
            columns: ["university_id"]
            isOneToOne: false
            referencedRelation: "university_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      resume_highlights: {
        Row: {
          created_at: string | null
          education: Json | null
          experience: Json | null
          id: string
          projects: Json | null
          resume_id: string
          skills: string[] | null
          summary: string | null
          tools: string[] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          education?: Json | null
          experience?: Json | null
          id?: string
          projects?: Json | null
          resume_id: string
          skills?: string[] | null
          summary?: string | null
          tools?: string[] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          education?: Json | null
          experience?: Json | null
          id?: string
          projects?: Json | null
          resume_id?: string
          skills?: string[] | null
          summary?: string | null
          tools?: string[] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resume_highlights_resume_id_fkey"
            columns: ["resume_id"]
            isOneToOne: false
            referencedRelation: "resumes"
            referencedColumns: ["id"]
          },
        ]
      }
      resumes: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          parsed_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          parsed_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          parsed_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      university_codes: {
        Row: {
          admin_user_id: string | null
          code: string
          created_at: string | null
          current_uses: number | null
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          university_name: string
          updated_at: string | null
        }
        Insert: {
          admin_user_id?: string | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          university_name: string
          updated_at?: string | null
        }
        Update: {
          admin_user_id?: string | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          university_name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vapi_logs: {
        Row: {
          created_at: string | null
          id: string
          interview_session_id: string
          log_type: string | null
          message: string | null
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          interview_session_id: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          id?: string
          interview_session_id?: string
          log_type?: string | null
          message?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "vapi_logs_interview_session_id_fkey"
            columns: ["interview_session_id"]
            isOneToOne: false
            referencedRelation: "interview_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_admin_university_id: {
        Args: { _admin_user_id: string }
        Returns: string
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_in_admin_university: {
        Args: { _admin_user_id: string; _user_id: string }
        Returns: boolean
      }
      validate_university_code: {
        Args: { code_input: string }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "student"
      interview_duration: "3" | "5"
      interview_status: "scheduled" | "in_progress" | "completed" | "cancelled"
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
      app_role: ["admin", "student"],
      interview_duration: ["3", "5"],
      interview_status: ["scheduled", "in_progress", "completed", "cancelled"],
    },
  },
} as const
