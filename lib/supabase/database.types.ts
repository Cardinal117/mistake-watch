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
          avatar_url: string | null;
          created_at: string;
          display_name: string;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          display_name: string;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
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
