export type User = {
  id: string;
  email: string;
  created_at: string;
};

export type Profile = {
  id: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
};

export type Document = {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  thumbnail_url: string | null;
  ocr_text?: string;
  ocr_processed?: boolean;
  tags?: string[];
  ai_processed?: boolean;
  page_count?: number;
  parent_document_id?: string | null;
  page_order?: number;
  created_at: string;
  updated_at: string;
};

export type Session = {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: User;
};

export type AuthResponse = {
  data: {
    user: User | null;
    session: Session | null;
  } | null;
  error: Error | null;
};

export type SupabaseConfig = {
  supabaseUrl: string;
  supabaseAnonKey: string;
};

// Database schema types
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: {
          id: string;
          username?: string | null;
          avatar_url?: string | null;
        };
        Update: {
          username?: string | null;
          avatar_url?: string | null;
        };
      };
      documents: {
        Row: Document;
        Insert: {
          user_id: string;
          title: string;
          file_url: string;
          thumbnail_url?: string | null;
          ocr_text?: string;
          ocr_processed?: boolean;
          tags?: string[];
          ai_processed?: boolean;
          page_count?: number;
          parent_document_id?: string | null;
          page_order?: number;
        };
        Update: {
          title?: string;
          file_url?: string;
          thumbnail_url?: string | null;
          ocr_text?: string;
          ocr_processed?: boolean;
          tags?: string[];
          ai_processed?: boolean;
          page_count?: number;
          parent_document_id?: string | null;
          page_order?: number;
        };
      };
    };
  };
};