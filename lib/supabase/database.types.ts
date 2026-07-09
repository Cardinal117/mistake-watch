export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      account_guest_migrations: {
        Row: {
          created_at: string;
          guest_identity_id: string;
          id: string;
          migrated_avatar_key: string | null;
          migrated_display_name: string | null;
          ownership_transferred: boolean;
          room_id: string;
          room_member_id: string | null;
          saved_room_transferred: boolean;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          guest_identity_id: string;
          id?: string;
          migrated_avatar_key?: string | null;
          migrated_display_name?: string | null;
          ownership_transferred?: boolean;
          room_id: string;
          room_member_id?: string | null;
          saved_room_transferred?: boolean;
          user_id: string;
        };
        Update: {
          created_at?: string;
          guest_identity_id?: string;
          id?: string;
          migrated_avatar_key?: string | null;
          migrated_display_name?: string | null;
          ownership_transferred?: boolean;
          room_id?: string;
          room_member_id?: string | null;
          saved_room_transferred?: boolean;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "account_guest_migrations_guest_identity_id_fkey";
            columns: ["guest_identity_id"];
            isOneToOne: false;
            referencedRelation: "guest_identities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_guest_migrations_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "account_guest_migrations_room_member_id_fkey";
            columns: ["room_member_id"];
            isOneToOne: false;
            referencedRelation: "room_members";
            referencedColumns: ["id"];
          },
        ];
      };
      guest_identities: {
        Row: {
          created_at: string;
          display_name: string;
          id: string;
          last_seen_at: string | null;
          room_id: string;
          token_hash: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          id?: string;
          last_seen_at?: string | null;
          room_id: string;
          token_hash: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          id?: string;
          last_seen_at?: string | null;
          room_id?: string;
          token_hash?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guest_identities_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      media_assets: {
        Row: {
          created_at: string;
          description: string | null;
          duration_seconds: number | null;
          episode_number: number | null;
          file_size_bytes: number;
          folder_id: string | null;
          id: string;
          inspection_result: Json;
          is_live: boolean;
          media_kind: string;
          mime_type: string;
          owner_user_id: string;
          estimated_credits: number | null;
          owner_approval_required: boolean;
          owner_approved_at: string | null;
          poster_status: string;
          processed_object_key: string | null;
          processing_completed_at: string | null;
          processing_error_message: string | null;
          processing_job_id: string | null;
          processing_provider: string | null;
          processing_started_at: string | null;
          processing_status: string;
          processing_strategy: string;
          public_url: string;
          r2_bucket: string;
          r2_object_key: string;
          season_number: number | null;
          sort_index: number;
          source_file_size_bytes: number | null;
          source_mime_type: string | null;
          source_object_key: string | null;
          source_type: string;
          status: string;
          thumbnail_object_key: string | null;
          thumbnail_url: string | null;
          title: string;
          updated_at: string;
          visibility: string;
          waveform_peaks_key: string | null;
          waveform_peaks_url: string | null;
          waveform_status: string;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          episode_number?: number | null;
          file_size_bytes: number;
          folder_id?: string | null;
          id?: string;
          inspection_result?: Json;
          is_live?: boolean;
          media_kind?: string;
          mime_type: string;
          owner_user_id: string;
          estimated_credits?: number | null;
          owner_approval_required?: boolean;
          owner_approved_at?: string | null;
          poster_status?: string;
          processed_object_key?: string | null;
          processing_completed_at?: string | null;
          processing_error_message?: string | null;
          processing_job_id?: string | null;
          processing_provider?: string | null;
          processing_started_at?: string | null;
          processing_status?: string;
          processing_strategy?: string;
          public_url: string;
          r2_bucket: string;
          r2_object_key: string;
          season_number?: number | null;
          sort_index?: number;
          source_file_size_bytes?: number | null;
          source_mime_type?: string | null;
          source_object_key?: string | null;
          source_type?: string;
          status?: string;
          thumbnail_object_key?: string | null;
          thumbnail_url?: string | null;
          title: string;
          updated_at?: string;
          visibility?: string;
          waveform_peaks_key?: string | null;
          waveform_peaks_url?: string | null;
          waveform_status?: string;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          duration_seconds?: number | null;
          episode_number?: number | null;
          file_size_bytes?: number;
          folder_id?: string | null;
          id?: string;
          inspection_result?: Json;
          is_live?: boolean;
          media_kind?: string;
          mime_type?: string;
          owner_user_id?: string;
          estimated_credits?: number | null;
          owner_approval_required?: boolean;
          owner_approved_at?: string | null;
          poster_status?: string;
          processed_object_key?: string | null;
          processing_completed_at?: string | null;
          processing_error_message?: string | null;
          processing_job_id?: string | null;
          processing_provider?: string | null;
          processing_started_at?: string | null;
          processing_status?: string;
          processing_strategy?: string;
          public_url?: string;
          r2_bucket?: string;
          r2_object_key?: string;
          season_number?: number | null;
          sort_index?: number;
          source_file_size_bytes?: number | null;
          source_mime_type?: string | null;
          source_object_key?: string | null;
          source_type?: string;
          status?: string;
          thumbnail_object_key?: string | null;
          thumbnail_url?: string | null;
          title?: string;
          updated_at?: string;
          visibility?: string;
          waveform_peaks_key?: string | null;
          waveform_peaks_url?: string | null;
          waveform_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey";
            columns: ["folder_id"];
            isOneToOne: false;
            referencedRelation: "media_folders";
            referencedColumns: ["id"];
          },
        ];
      };
      media_folders: {
        Row: {
          created_at: string;
          default_sort_direction: string;
          default_sort_key: string;
          description: string | null;
          folder_type: string;
          id: string;
          name: string;
          owner_user_id: string;
          slug: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          default_sort_direction?: string;
          default_sort_key?: string;
          description?: string | null;
          folder_type?: string;
          id?: string;
          name: string;
          owner_user_id: string;
          slug: string;
          sort_order?: number;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          default_sort_direction?: string;
          default_sort_key?: string;
          description?: string | null;
          folder_type?: string;
          id?: string;
          name?: string;
          owner_user_id?: string;
          slug?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      media_processing_events: {
        Row: {
          created_at: string;
          id: string;
          job_id: string | null;
          media_asset_id: string;
          message: string | null;
          payload: Json | null;
          provider: string;
          status: string;
          task_name: string | null;
          task_operation: string | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          job_id?: string | null;
          media_asset_id: string;
          message?: string | null;
          payload?: Json | null;
          provider?: string;
          status: string;
          task_name?: string | null;
          task_operation?: string | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          job_id?: string | null;
          media_asset_id?: string;
          message?: string | null;
          payload?: Json | null;
          provider?: string;
          status?: string;
          task_name?: string | null;
          task_operation?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "media_processing_events_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_source_matches: {
        Row: {
          created_at: string;
          id: string;
          media_asset_id: string;
          normalized_source_url: string | null;
          source_id: string;
          source_type: string;
          status: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          media_asset_id: string;
          normalized_source_url?: string | null;
          source_id: string;
          source_type: string;
          status?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          media_asset_id?: string;
          normalized_source_url?: string | null;
          source_id?: string;
          source_type?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_source_matches_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      media_upload_sessions: {
        Row: {
          bytes_uploaded: number;
          completed_parts: Json;
          created_at: string;
          error_message: string | null;
          expires_at: string;
          file_size_bytes: number;
          id: string;
          media_asset_id: string | null;
          mime_type: string;
          multipart_upload_id: string | null;
          object_key: string;
          original_filename: string;
          owner_user_id: string;
          part_count: number | null;
          part_size_bytes: number | null;
          resumable_until: string | null;
          status: string;
          updated_at: string;
          upload_mode: string;
        };
        Insert: {
          bytes_uploaded?: number;
          completed_parts?: Json;
          created_at?: string;
          error_message?: string | null;
          expires_at: string;
          file_size_bytes: number;
          id?: string;
          media_asset_id?: string | null;
          mime_type: string;
          multipart_upload_id?: string | null;
          object_key: string;
          original_filename: string;
          owner_user_id: string;
          part_count?: number | null;
          part_size_bytes?: number | null;
          resumable_until?: string | null;
          status?: string;
          updated_at?: string;
          upload_mode?: string;
        };
        Update: {
          bytes_uploaded?: number;
          completed_parts?: Json;
          created_at?: string;
          error_message?: string | null;
          expires_at?: string;
          file_size_bytes?: number;
          id?: string;
          media_asset_id?: string | null;
          mime_type?: string;
          multipart_upload_id?: string | null;
          object_key?: string;
          original_filename?: string;
          owner_user_id?: string;
          part_count?: number | null;
          part_size_bytes?: number | null;
          resumable_until?: string | null;
          status?: string;
          updated_at?: string;
          upload_mode?: string;
        };
        Relationships: [
          {
            foreignKeyName: "media_upload_sessions_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
        ];
      };
      uploaded_catalogue_authorizations: {
        Row: {
          created_at: string;
          granted_by_user_id: string | null;
          id: string;
          note: string | null;
          revoked_at: string | null;
          status: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          note?: string | null;
          revoked_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          granted_by_user_id?: string | null;
          id?: string;
          note?: string | null;
          revoked_at?: string | null;
          status?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      room_media_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          expires_at: string;
          id: string;
          media_asset_id: string;
          room_id: string;
          started_at: string;
          started_by_member_id: string | null;
          started_by_user_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          expires_at: string;
          id?: string;
          media_asset_id: string;
          room_id: string;
          started_at?: string;
          started_by_member_id?: string | null;
          started_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          expires_at?: string;
          id?: string;
          media_asset_id?: string;
          room_id?: string;
          started_at?: string;
          started_by_member_id?: string | null;
          started_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "room_media_sessions_media_asset_id_fkey";
            columns: ["media_asset_id"];
            isOneToOne: false;
            referencedRelation: "media_assets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_media_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_media_sessions_started_by_member_id_fkey";
            columns: ["started_by_member_id"];
            isOneToOne: false;
            referencedRelation: "room_members";
            referencedColumns: ["id"];
          },
        ];
      };
      member_permissions: {
        Row: {
          can_add_queue: boolean | null;
          can_control_browser: boolean | null;
          can_control_playback: boolean | null;
          can_load_source: boolean | null;
          can_manage_queue: boolean | null;
          guest_identity_id: string | null;
          id: string;
          room_id: string;
          updated_at: string;
          user_id: string | null;
        };
        Insert: {
          can_add_queue?: boolean | null;
          can_control_browser?: boolean | null;
          can_control_playback?: boolean | null;
          can_load_source?: boolean | null;
          can_manage_queue?: boolean | null;
          guest_identity_id?: string | null;
          id?: string;
          room_id: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Update: {
          can_add_queue?: boolean | null;
          can_control_browser?: boolean | null;
          can_control_playback?: boolean | null;
          can_load_source?: boolean | null;
          can_manage_queue?: boolean | null;
          guest_identity_id?: string | null;
          id?: string;
          room_id?: string;
          updated_at?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "member_permissions_guest_identity_id_fkey";
            columns: ["guest_identity_id"];
            isOneToOne: false;
            referencedRelation: "guest_identities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "member_permissions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      playback_sessions: {
        Row: {
          created_at: string;
          ended_at: string | null;
          id: string;
          last_position_seconds: number | null;
          last_status: string | null;
          queue_item_id: string | null;
          room_id: string;
          source_type: string;
          source_url: string;
          started_at: string | null;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          last_position_seconds?: number | null;
          last_status?: string | null;
          queue_item_id?: string | null;
          room_id: string;
          source_type: string;
          source_url: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          ended_at?: string | null;
          id?: string;
          last_position_seconds?: number | null;
          last_status?: string | null;
          queue_item_id?: string | null;
          room_id?: string;
          source_type?: string;
          source_url?: string;
          started_at?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "playback_sessions_queue_item_id_fkey";
            columns: ["queue_item_id"];
            isOneToOne: false;
            referencedRelation: "queue_items";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "playback_sessions_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          account_status: string;
          avatar_key: string | null;
          avatar_source: string;
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          google_avatar_url: string | null;
          handle: string | null;
          id: string;
          role: string;
          updated_at: string;
        };
        Insert: {
          account_status?: string;
          avatar_key?: string | null;
          avatar_source?: string;
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          google_avatar_url?: string | null;
          handle?: string | null;
          id: string;
          role?: string;
          updated_at?: string;
        };
        Update: {
          account_status?: string;
          avatar_key?: string | null;
          avatar_source?: string;
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          google_avatar_url?: string | null;
          handle?: string | null;
          id?: string;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      queue_items: {
        Row: {
          added_by_guest_identity_id: string | null;
          added_by_user_id: string | null;
          artist: string | null;
          created_at: string;
          duration_seconds: number | null;
          id: string;
          position: number;
          provider_id: string | null;
          room_id: string;
          source_type: string;
          source_url: string;
          status: string;
          title: string | null;
          updated_at: string;
        };
        Insert: {
          added_by_guest_identity_id?: string | null;
          added_by_user_id?: string | null;
          artist?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          position: number;
          provider_id?: string | null;
          room_id: string;
          source_type: string;
          source_url: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
        };
        Update: {
          added_by_guest_identity_id?: string | null;
          added_by_user_id?: string | null;
          artist?: string | null;
          created_at?: string;
          duration_seconds?: number | null;
          id?: string;
          position?: number;
          provider_id?: string | null;
          room_id?: string;
          source_type?: string;
          source_url?: string;
          status?: string;
          title?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "queue_items_added_by_guest_identity_id_fkey";
            columns: ["added_by_guest_identity_id"];
            isOneToOne: false;
            referencedRelation: "guest_identities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "queue_items_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_members: {
        Row: {
          display_name: string;
          guest_identity_id: string | null;
          id: string;
          joined_at: string;
          last_seen_at: string | null;
          linked_from_guest_identity_id: string | null;
          role: string;
          room_id: string;
          user_id: string | null;
        };
        Insert: {
          display_name: string;
          guest_identity_id?: string | null;
          id?: string;
          joined_at?: string;
          last_seen_at?: string | null;
          linked_from_guest_identity_id?: string | null;
          role?: string;
          room_id: string;
          user_id?: string | null;
        };
        Update: {
          display_name?: string;
          guest_identity_id?: string | null;
          id?: string;
          joined_at?: string;
          last_seen_at?: string | null;
          linked_from_guest_identity_id?: string | null;
          role?: string;
          room_id?: string;
          user_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "room_members_guest_identity_id_fkey";
            columns: ["guest_identity_id"];
            isOneToOne: false;
            referencedRelation: "guest_identities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "room_members_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: false;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      room_settings: {
        Row: {
          browser_mode_enabled: boolean;
          created_at: string;
          guest_can_add_queue: boolean;
          guest_can_control_playback: boolean;
          guest_can_load_source: boolean;
          room_id: string;
          updated_at: string;
          voting_enabled: boolean;
        };
        Insert: {
          browser_mode_enabled?: boolean;
          created_at?: string;
          guest_can_add_queue?: boolean;
          guest_can_control_playback?: boolean;
          guest_can_load_source?: boolean;
          room_id: string;
          updated_at?: string;
          voting_enabled?: boolean;
        };
        Update: {
          browser_mode_enabled?: boolean;
          created_at?: string;
          guest_can_add_queue?: boolean;
          guest_can_control_playback?: boolean;
          guest_can_load_source?: boolean;
          room_id?: string;
          updated_at?: string;
          voting_enabled?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "room_settings_room_id_fkey";
            columns: ["room_id"];
            isOneToOne: true;
            referencedRelation: "rooms";
            referencedColumns: ["id"];
          },
        ];
      };
      rooms: {
        Row: {
          close_reason: string | null;
          closed_at: string | null;
          created_at: string;
          id: string;
          idle_deadline_at: string | null;
          invite_code: string;
          invite_token_hash: string;
          is_saved: boolean;
          last_active_at: string | null;
          mode: string;
          name: string;
          owner_user_id: string | null;
          privacy: string;
          saved_by_guest_identity_id: string | null;
          saved_by_user_id: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          close_reason?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          idle_deadline_at?: string | null;
          invite_code: string;
          invite_token_hash: string;
          is_saved?: boolean;
          last_active_at?: string | null;
          mode?: string;
          name: string;
          owner_user_id?: string | null;
          privacy?: string;
          saved_by_guest_identity_id?: string | null;
          saved_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          close_reason?: string | null;
          closed_at?: string | null;
          created_at?: string;
          id?: string;
          idle_deadline_at?: string | null;
          invite_code?: string;
          invite_token_hash?: string;
          is_saved?: boolean;
          last_active_at?: string | null;
          mode?: string;
          name?: string;
          owner_user_id?: string | null;
          privacy?: string;
          saved_by_guest_identity_id?: string | null;
          saved_by_user_id?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [];
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

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
