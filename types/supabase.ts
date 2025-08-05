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

export type ReceiptLineItem = {
  description: string;
  quantity?: number;
  unit_price?: number;
  total_price?: number;
};

export type ReceiptData = {
  vendor_name?: string;
  vendor_address?: string;
  vendor_phone?: string;
  total_amount?: number;
  subtotal?: number;
  tax_amount?: number;
  tip_amount?: number;
  date?: string;
  time?: string;
  receipt_number?: string;
  payment_method?: string;
  line_items?: ReceiptLineItem[];
  currency?: string;
  confidence_score?: number;
  extracted_at?: string;
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
  receipt_data?: ReceiptData;
  receipt_processed?: boolean;
  is_signed?: boolean;
  signed_document_url?: string | null;
  signature_data?: SignatureData[];
  created_at: string;
  updated_at: string;
};

export type Signature = {
  id: string;
  user_id: string;
  name: string;
  signature_data: string; // Base64 encoded signature image
  created_at: string;
  updated_at: string;
};

export type SignatureData = {
  signature_id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
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
          receipt_data?: ReceiptData;
          receipt_processed?: boolean;
          is_signed?: boolean;
          signed_document_url?: string | null;
          signature_data?: SignatureData[];
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
          receipt_data?: ReceiptData;
          receipt_processed?: boolean;
          is_signed?: boolean;
          signed_document_url?: string | null;
          signature_data?: SignatureData[];
        };
      };
      signatures: {
        Row: Signature;
        Insert: {
          user_id: string;
          name: string;
          signature_data: string;
        };
        Update: {
          name?: string;
          signature_data?: string;
        };
      };
    };
  };
};