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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          color: string
          context: string
          created_at: string
          id: string
          name: string
          parent_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          context?: string
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          context?: string
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      category_items: {
        Row: {
          category_id: string
          created_at: string
          id: string
          item_id: string
          item_type: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          item_id: string
          item_type: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          item_id?: string
          item_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      course_lessons: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          duration_seconds: number | null
          id: string
          module_id: string
          name: string
          position: number
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id: string
          name: string
          position?: number
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          duration_seconds?: number | null
          id?: string
          module_id?: string
          name?: string
          position?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          completed: boolean
          completed_at: string | null
          course_id: string
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          lesson_count: number
          name: string
          position: number
          subject_ids: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          course_id: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_count?: number
          name: string
          position?: number
          subject_ids?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          lesson_count?: number
          name?: string
          position?: number
          subject_ids?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_subjects: {
        Row: {
          course_id: string
          created_at: string
          id: string
          subject_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          subject_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          subject_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_subjects_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_subjects_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          color: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          id: string
          name: string
          plan_days: number[] | null
          plan_deadline: string | null
          plan_priority: number
          plan_weekly_hours: number | null
          target_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name: string
          plan_days?: number[] | null
          plan_deadline?: string | null
          plan_priority?: number
          plan_weekly_hours?: number | null
          target_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          plan_days?: number[] | null
          plan_deadline?: string | null
          plan_priority?: number
          plan_weekly_hours?: number | null
          target_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      daily_goals: {
        Row: {
          created_at: string
          hours_per_day: number
          id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          hours_per_day?: number
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          hours_per_day?: number
          id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      frozen_days: {
        Row: {
          compensated: boolean
          compensated_at: string | null
          compensation_date: string
          compensation_hours: number
          created_at: string
          frozen_date: string
          id: string
          reason: string
          updated_at: string
          user_id: string
        }
        Insert: {
          compensated?: boolean
          compensated_at?: string | null
          compensation_date: string
          compensation_hours?: number
          created_at?: string
          frozen_date: string
          id?: string
          reason: string
          updated_at?: string
          user_id: string
        }
        Update: {
          compensated?: boolean
          compensated_at?: string | null
          compensation_date?: string
          compensation_hours?: number
          created_at?: string
          frozen_date?: string
          id?: string
          reason?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      goals: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          end_date: string
          id: string
          period: string
          reward: string | null
          start_date: string
          subject_id: string | null
          target_hours: number
          title: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date: string
          id?: string
          period: string
          reward?: string | null
          start_date: string
          subject_id?: string | null
          target_hours?: number
          title: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          end_date?: string
          id?: string
          period?: string
          reward?: string | null
          start_date?: string
          subject_id?: string | null
          target_hours?: number
          title?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goals_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      language_courses: {
        Row: {
          color: string
          completed: boolean
          completed_at: string | null
          created_at: string
          description: string | null
          icon: string | null
          id: string
          language_id: string
          name: string
          subject_ids: string[]
          total_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          language_id: string
          name: string
          subject_ids?: string[]
          total_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          language_id?: string
          name?: string
          subject_ids?: string[]
          total_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_courses_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      language_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          end_time: string
          hours: number
          id: string
          language_id: string
          notes: string | null
          start_time: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          end_time: string
          hours?: number
          id?: string
          language_id: string
          notes?: string | null
          start_time: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          hours?: number
          id?: string
          language_id?: string
          notes?: string | null
          start_time?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "language_courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_sessions_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "language_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "language_subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      language_subjects: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          language_id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          language_id: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          language_id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "language_subjects_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      languages: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          level: Database["public"]["Enums"]["language_level"]
          name: string
          notes: string | null
          plan_days: number[] | null
          plan_deadline: string | null
          plan_priority: number
          plan_weekly_hours: number | null
          resources: Json
          start_date: string | null
          target_hours: number
          updated_at: string
          user_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          level?: Database["public"]["Enums"]["language_level"]
          name: string
          notes?: string | null
          plan_days?: number[] | null
          plan_deadline?: string | null
          plan_priority?: number
          plan_weekly_hours?: number | null
          resources?: Json
          start_date?: string | null
          target_hours?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          level?: Database["public"]["Enums"]["language_level"]
          name?: string
          notes?: string | null
          plan_days?: number[] | null
          plan_deadline?: string | null
          plan_priority?: number
          plan_weekly_hours?: number | null
          resources?: Json
          start_date?: string | null
          target_hours?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      learning_path_steps: {
        Row: {
          completed_at: string | null
          created_at: string
          estimated_hours: number | null
          icon: string | null
          id: string
          module_id: string | null
          name: string
          parent_id: string | null
          path_id: string
          position: number
          status: Database["public"]["Enums"]["step_status"]
          study_note: string
          subject_id: string | null
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          estimated_hours?: number | null
          icon?: string | null
          id?: string
          module_id?: string | null
          name: string
          parent_id?: string | null
          path_id: string
          position?: number
          status?: Database["public"]["Enums"]["step_status"]
          study_note?: string
          subject_id?: string | null
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          estimated_hours?: number | null
          icon?: string | null
          id?: string
          module_id?: string | null
          name?: string
          parent_id?: string | null
          path_id?: string
          position?: number
          status?: Database["public"]["Enums"]["step_status"]
          study_note?: string
          subject_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_steps_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_steps_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "learning_path_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_steps_path_id_fkey"
            columns: ["path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_steps_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          course_id: string | null
          created_at: string
          description: string | null
          estimated_hours: number | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          description?: string | null
          estimated_hours?: number | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "learning_paths_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_blocks: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          id: string
          label: string | null
          language_id: string | null
          planned_minutes: number
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          id?: string
          label?: string | null
          language_id?: string | null
          planned_minutes: number
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          id?: string
          label?: string | null
          language_id?: string | null
          planned_minutes?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_blocks_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_blocks_language_id_fkey"
            columns: ["language_id"]
            isOneToOne: false
            referencedRelation: "languages"
            referencedColumns: ["id"]
          },
        ]
      }
      pomodoro_settings: {
        Row: {
          created_at: string
          focus_minutes: number
          id: string
          long_break_minutes: number
          short_break_minutes: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          focus_minutes?: number
          id?: string
          long_break_minutes?: number
          short_break_minutes?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          focus_minutes?: number
          id?: string
          long_break_minutes?: number
          short_break_minutes?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      practice_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          end_time: string
          hours: number
          id: string
          notes: string | null
          practice_type: string
          start_time: string
          subject_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          end_time: string
          hours?: number
          id?: string
          notes?: string | null
          practice_type?: string
          start_time: string
          subject_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          hours?: number
          id?: string
          notes?: string | null
          practice_type?: string
          start_time?: string
          subject_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "practice_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "practice_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          date_of_birth: string | null
          display_name: string | null
          full_name: string | null
          id: string
          updated_at: string
          user_id: string
          user_type: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
          user_type?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          date_of_birth?: string | null
          display_name?: string | null
          full_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
          user_type?: string | null
        }
        Relationships: []
      }
      study_sessions: {
        Row: {
          course_id: string | null
          created_at: string
          date: string
          end_time: string
          hours: number
          id: string
          notes: string | null
          start_time: string
          step_id: string | null
          subject_id: string
          user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          date: string
          end_time: string
          hours?: number
          id?: string
          notes?: string | null
          start_time: string
          step_id?: string | null
          subject_id: string
          user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          date?: string
          end_time?: string
          hours?: number
          id?: string
          notes?: string | null
          start_time?: string
          step_id?: string | null
          subject_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "study_sessions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "learning_path_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "study_sessions_subject_id_fkey"
            columns: ["subject_id"]
            isOneToOne: false
            referencedRelation: "subjects"
            referencedColumns: ["id"]
          },
        ]
      }
      subjects: {
        Row: {
          color: string
          created_at: string
          icon: string | null
          id: string
          name: string
          user_id: string | null
        }
        Insert: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          user_id?: string | null
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      language_level: "beginner" | "intermediate" | "advanced"
      step_status: "not_started" | "in_progress" | "completed"
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
      language_level: ["beginner", "intermediate", "advanced"],
      step_status: ["not_started", "in_progress", "completed"],
    },
  },
} as const
