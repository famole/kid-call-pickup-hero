export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      class_teachers: {
        Row: {
          class_id: string
          created_at: string
          id: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          id?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          id?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_teachers_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "class_teachers_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          grade: string
          id: string
          name: string
          teacher: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          grade: string
          id?: string
          name: string
          teacher: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          grade?: string
          id?: string
          name?: string
          teacher?: string
          updated_at?: string
        }
        Relationships: []
      }
      parents: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          phone: string | null
          role: Database["public"]["Enums"]["app_role"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          name: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["app_role"] | null
          updated_at?: string
        }
        Relationships: []
      }
      pickup_authorizations: {
        Row: {
          authorized_parent_id: string
          authorizing_parent_id: string
          created_at: string
          end_date: string
          id: string
          is_active: boolean
          start_date: string
          student_id: string
          updated_at: string
        }
        Insert: {
          authorized_parent_id: string
          authorizing_parent_id: string
          created_at?: string
          end_date: string
          id?: string
          is_active?: boolean
          start_date: string
          student_id: string
          updated_at?: string
        }
        Update: {
          authorized_parent_id?: string
          authorizing_parent_id?: string
          created_at?: string
          end_date?: string
          id?: string
          is_active?: boolean
          start_date?: string
          student_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pickup_authorizations_authorized_parent_id_fkey"
            columns: ["authorized_parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pickup_authorizations_authorizing_parent_id_fkey"
            columns: ["authorizing_parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      pickup_history: {
        Row: {
          called_time: string | null
          completed_time: string
          created_at: string
          id: string
          parent_id: string
          pickup_duration_minutes: number | null
          request_time: string
          student_id: string
        }
        Insert: {
          called_time?: string | null
          completed_time: string
          created_at?: string
          id?: string
          parent_id: string
          pickup_duration_minutes?: number | null
          request_time: string
          student_id: string
        }
        Update: {
          called_time?: string | null
          completed_time?: string
          created_at?: string
          id?: string
          parent_id?: string
          pickup_duration_minutes?: number | null
          request_time?: string
          student_id?: string
        }
        Relationships: []
      }
      pickup_requests: {
        Row: {
          id: string
          parent_id: string
          request_time: string | null
          status: string | null
          student_id: string
        }
        Insert: {
          id?: string
          parent_id: string
          request_time?: string | null
          status?: string | null
          student_id: string
        }
        Update: {
          id?: string
          parent_id?: string
          request_time?: string | null
          status?: string | null
          student_id?: string
        }
        Relationships: []
      }
      student_parents: {
        Row: {
          created_at: string
          id: string
          is_primary: boolean
          parent_id: string
          relationship: string | null
          student_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id: string
          relationship?: string | null
          student_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_primary?: boolean
          parent_id?: string
          relationship?: string | null
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_parents_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "parents"
            referencedColumns: ["id"]
          },
        ]
      }
      students: {
        Row: {
          avatar: string | null
          class_id: string | null
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar?: string | null
          class_id?: string | null
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_role: {
        Args: { user_email: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
    }
    Enums: {
      app_role: "parent" | "admin" | "teacher"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["parent", "admin", "teacher"],
    },
  },
} as const
