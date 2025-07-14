export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instanciate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      collection_files: {
        Row: {
          added_at: string | null
          collection_id: string
          file_id: string
          id: string
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          file_id: string
          id?: string
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          file_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collection_files_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_files_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          color: string | null
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string
          query: Json | null
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name: string
          query?: Json | null
          type: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string
          query?: Json | null
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      file_progress: {
        Row: {
          file_id: string
          id: string
          last_position: string | null
          progress_percentage: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          file_id: string
          id?: string
          last_position?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          file_id?: string
          id?: string
          last_position?: string | null
          progress_percentage?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_progress_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_progress_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      file_tags: {
        Row: {
          created_at: string | null
          file_id: string
          id: string
          tag_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          file_id: string
          id?: string
          tag_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          file_id?: string
          id?: string
          tag_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_progress"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "file_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          author: string | null
          cover_art_path: string | null
          cover_art_url: string | null
          cover_path: string | null
          description: string | null
          duplicate_group_id: string | null
          file_path: string
          file_size: number | null
          file_type: string
          filename: string
          genre: string[] | null
          id: string
          is_favorite: boolean | null
          isbn: string | null
          language: string | null
          last_accessed_at: string | null
          metadata_extracted: boolean | null
          publication_date: string | null
          publisher: string | null
          rating: number | null
          series: string | null
          series_index: number | null
          series_number: number | null
          tags: string[] | null
          title: string | null
          uploaded_at: string | null
          user_id: string
        }
        Insert: {
          author?: string | null
          cover_art_path?: string | null
          cover_art_url?: string | null
          cover_path?: string | null
          description?: string | null
          duplicate_group_id?: string | null
          file_path: string
          file_size?: number | null
          file_type: string
          filename: string
          genre?: string[] | null
          id?: string
          is_favorite?: boolean | null
          isbn?: string | null
          language?: string | null
          last_accessed_at?: string | null
          metadata_extracted?: boolean | null
          publication_date?: string | null
          publisher?: string | null
          rating?: number | null
          series?: string | null
          series_index?: number | null
          series_number?: number | null
          tags?: string[] | null
          title?: string | null
          uploaded_at?: string | null
          user_id: string
        }
        Update: {
          author?: string | null
          cover_art_path?: string | null
          cover_art_url?: string | null
          cover_path?: string | null
          description?: string | null
          duplicate_group_id?: string | null
          file_path?: string
          file_size?: number | null
          file_type?: string
          filename?: string
          genre?: string[] | null
          id?: string
          is_favorite?: boolean | null
          isbn?: string | null
          language?: string | null
          last_accessed_at?: string | null
          metadata_extracted?: boolean | null
          publication_date?: string | null
          publisher?: string | null
          rating?: number | null
          series?: string | null
          series_index?: number | null
          series_number?: number | null
          tags?: string[] | null
          title?: string | null
          uploaded_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      reading_sessions: {
        Row: {
          duration_minutes: number | null
          ended_at: string | null
          file_id: string
          id: string
          notes: string | null
          pages_read: number | null
          session_type: string | null
          started_at: string | null
          user_id: string
        }
        Insert: {
          duration_minutes?: number | null
          ended_at?: string | null
          file_id: string
          id?: string
          notes?: string | null
          pages_read?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id: string
        }
        Update: {
          duration_minutes?: number | null
          ended_at?: string | null
          file_id?: string
          id?: string
          notes?: string | null
          pages_read?: number | null
          session_type?: string | null
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_sessions_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string | null
          created_at: string | null
          id: string
          name: string
          user_id: string
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          id?: string
          name: string
          user_id: string
        }
        Update: {
          color?: string | null
          created_at?: string | null
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      tts_monthly_usage: {
        Row: {
          created_at: string | null
          id: string
          month_year: string
          total_characters: number | null
          total_cost_cents: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          month_year: string
          total_characters?: number | null
          total_cost_cents?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          month_year?: string
          total_characters?: number | null
          total_cost_cents?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      tts_usage: {
        Row: {
          audio_url: string | null
          character_count: number
          cost_cents: number | null
          created_at: string | null
          file_id: string | null
          id: string
          text_snippet: string
          user_id: string
          voice_id: string
        }
        Insert: {
          audio_url?: string | null
          character_count: number
          cost_cents?: number | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          text_snippet: string
          user_id: string
          voice_id: string
        }
        Update: {
          audio_url?: string | null
          character_count?: number
          cost_cents?: number | null
          created_at?: string | null
          file_id?: string | null
          id?: string
          text_snippet?: string
          user_id?: string
          voice_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tts_usage_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tts_usage_file_id_fkey"
            columns: ["file_id"]
            isOneToOne: false
            referencedRelation: "files_with_progress"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      files_with_progress: {
        Row: {
          author: string | null
          cover_art_url: string | null
          cover_path: string | null
          description: string | null
          display_author: string | null
          display_title: string | null
          duplicate_group_id: string | null
          file_path: string | null
          file_size: number | null
          file_type: string | null
          filename: string | null
          genre: string[] | null
          id: string | null
          is_favorite: boolean | null
          isbn: string | null
          language: string | null
          last_position: string | null
          metadata_extracted: boolean | null
          progress_percentage: number | null
          progress_updated_at: string | null
          publication_date: string | null
          publisher: string | null
          rating: number | null
          series: string | null
          series_index: number | null
          tags: string[] | null
          title: string | null
          uploaded_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      extract_metadata_from_filename: {
        Args: { filename: string }
        Returns: Json
      }
      get_current_month_tts_usage: {
        Args: { target_user_id: string }
        Returns: {
          total_characters: number
          total_cost_cents: number
          current_month: string
        }[]
      }
      search_files: {
        Args: {
          search_user_id: string
          search_query: string
          search_limit?: number
        }
        Returns: {
          id: string
          filename: string
          title: string
          author: string
          series: string
          genre: string
          language: string
          description: string
          file_type: string
          file_size: number
          uploaded_at: string
          progress_percentage: number
          search_rank: number
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
