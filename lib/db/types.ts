export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type FieldType = "text" | "email" | "phone" | "textarea" | "select" | "checkbox";

export type AppRole = "super_admin" | "admin";

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string | null;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          created_by: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          created_by: string;
          created_at?: string;
        };
        Update: {
          name?: string;
        };
      };
      memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: AppRole;
          created_at?: string;
        };
        Update: {
          role?: AppRole;
        };
      };
      documents: {
        Row: {
          id: string;
          organization_id: string;
          uploaded_by: string;
          title: string;
          storage_path: string;
          file_size: number | null;
          mime_type: string | null;
          created_at: string;
          landing_page: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          uploaded_by: string;
          title: string;
          storage_path: string;
          file_size?: number | null;
          mime_type?: string | null;
          created_at?: string;
          landing_page?: Json;
        };
        Update: {
          title?: string;
          landing_page?: Json;
        };
      };
      spaces: {
        Row: {
          id: string;
          organization_id: string;
          created_by: string;
          name: string;
          slug: string;
          description: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
          landing_page: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          created_by: string;
          name: string;
          slug: string;
          description?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
          landing_page?: Json;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string | null;
          is_active?: boolean;
          updated_at?: string;
          landing_page?: Json;
        };
      };
      space_documents: {
        Row: {
          id: string;
          space_id: string;
          document_id: string;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id: string;
          document_id: string;
          position?: number;
          created_at?: string;
        };
        Update: {
          position?: number;
        };
      };
      share_links: {
        Row: {
          id: string;
          organization_id: string;
          link_type: "space" | "document";
          space_id: string | null;
          document_id: string | null;
          name: string | null;
          token: string;
          requires_intake: boolean;
          expires_at: string | null;
          created_by: string;
          created_at: string;
          intake_settings: Json;
        };
        Insert: {
          id?: string;
          organization_id: string;
          link_type: "space" | "document";
          space_id?: string | null;
          document_id?: string | null;
          name?: string | null;
          token: string;
          requires_intake?: boolean;
          expires_at?: string | null;
          created_by: string;
          created_at?: string;
          intake_settings?: Json;
        };
        Update: {
          name?: string | null;
          requires_intake?: boolean;
          expires_at?: string | null;
          intake_settings?: Json;
        };
      };
      share_link_fields: {
        Row: {
          id: string;
          share_link_id: string;
          field_type: FieldType;
          field_name: string;
          label: string;
          is_required: boolean;
          options: Json | null;
          placeholder: string | null;
          help_text: string | null;
          default_value: string | null;
          width: "full" | "half";
          validation_rule: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          share_link_id: string;
          field_type: FieldType;
          field_name: string;
          label: string;
          is_required?: boolean;
          options?: Json | null;
          placeholder?: string | null;
          help_text?: string | null;
          default_value?: string | null;
          width?: "full" | "half";
          validation_rule?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          field_type?: FieldType;
          field_name?: string;
          label?: string;
          is_required?: boolean;
          options?: Json | null;
          placeholder?: string | null;
          help_text?: string | null;
          default_value?: string | null;
          width?: "full" | "half";
          validation_rule?: string | null;
          position?: number;
        };
      };
      visitor_submissions: {
        Row: {
          id: string;
          space_id: string | null;
          document_id: string | null;
          share_link_id: string | null;
          payload: Json;
          ip_hash: string | null;
          user_agent: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id?: string | null;
          document_id?: string | null;
          share_link_id?: string | null;
          payload: Json;
          ip_hash?: string | null;
          user_agent?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      view_sessions: {
        Row: {
          id: string;
          space_id: string | null;
          document_id: string | null;
          visitor_submission_id: string | null;
          started_at: string;
          ended_at: string | null;
          viewer_fingerprint: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          space_id?: string | null;
          document_id?: string | null;
          visitor_submission_id?: string | null;
          started_at?: string;
          ended_at?: string | null;
          viewer_fingerprint?: string | null;
          created_at?: string;
        };
        Update: {
          ended_at?: string | null;
          viewer_fingerprint?: string | null;
        };
      };
      downloads: {
        Row: {
          id: string;
          document_id: string;
          space_id: string | null;
          visitor_submission_id: string | null;
          downloaded_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          document_id: string;
          space_id?: string | null;
          visitor_submission_id?: string | null;
          downloaded_at?: string;
          created_at?: string;
        };
        Update: never;
      };
      share_link_access_grants: {
        Row: {
          id: string;
          share_link_id: string;
          visitor_submission_id: string;
          token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          share_link_id: string;
          visitor_submission_id: string;
          token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: never;
      };
    };
  };
};
