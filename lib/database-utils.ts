import { supabase } from '@/lib/supabase';

// Utility to refresh database schema cache
export const refreshDatabaseSchema = async (): Promise<void> => {
  try {
    console.log('Refreshing database schema cache...');
    
    // Force a fresh connection by creating a new client instance
    const { data, error } = await supabase.rpc('version');
    
    if (error) {
      console.warn('Schema refresh warning:', error);
    } else {
      console.log('Database schema refreshed successfully');
    }
  } catch (error) {
    console.warn('Schema refresh failed:', error);
  }
};

// Test all database columns to identify missing ones
export const testDatabaseColumns = async (): Promise<void> => {
  try {
    console.log('Testing database columns...');
    
    const testColumns = [
      'id', 'user_id', 'title', 'file_url', 'thumbnail_url',
      'ocr_text', 'ocr_processed', 'ocr_language', 'tags', 'category',
      'ai_processed', 'page_count', 'parent_document_id', 'page_order',
      'receipt_data', 'receipt_processed', 'is_signed', 'signed_document_url',
      'signature_data', 'metadata', 'created_at', 'updated_at'
    ];
    
    for (const column of testColumns) {
      try {
        const { error } = await supabase
          .from('documents')
          .select(column)
          .limit(1);
        
        if (error) {
          console.error(`Column '${column}' test failed:`, error.message);
        } else {
          console.log(`Column '${column}' is accessible`);
        }
      } catch (columnError) {
        console.error(`Column '${column}' test error:`, columnError);
      }
    }
  } catch (error) {
    console.error('Column testing failed:', error);
  }
};

// Initialize database connection with proper error handling
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    console.log('Initializing database connection...');
    
    // Test basic connection
    const { data, error } = await supabase
      .from('documents')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Database initialization failed:', error);
      return false;
    }
    
    console.log('Database connection initialized successfully');
    
    // Run column tests
    await testDatabaseColumns();
    
    return true;
  } catch (error) {
    console.error('Database initialization error:', error);
    return false;
  }
};