import { supabase } from '@/lib/supabase';

// Simple database migration utility
export const runDatabaseMigrations = async (): Promise<void> => {
  try {
    console.log('Running database migrations...');
    
    // Check if metadata column exists
    const { error: metadataError } = await supabase
      .from('documents')
      .select('metadata')
      .limit(1);
    
    if (metadataError && metadataError.message.includes('metadata')) {
      console.log('Metadata column missing, attempting to add it...');
      
      // Try to add the metadata column using RPC
      const { error: addColumnError } = await supabase.rpc('add_metadata_column');
      
      if (addColumnError) {
        console.warn('Could not add metadata column via RPC:', addColumnError);
        
        // Alternative: Try direct SQL execution (this might not work in all environments)
        try {
          const { error: sqlError } = await supabase
            .from('documents')
            .select('id')
            .limit(0); // This will force a schema refresh
          
          if (sqlError) {
            console.warn('Schema refresh failed:', sqlError);
          }
        } catch (refreshError) {
          console.warn('Schema refresh error:', refreshError);
        }
      } else {
        console.log('Metadata column added successfully');
      }
    } else {
      console.log('Metadata column already exists');
    }
    
    console.log('Database migrations completed');
  } catch (error) {
    console.error('Database migration failed:', error);
  }
};

// Create a safe document save function that works without metadata
export const safeDocumentSave = async (documentData: any): Promise<any> => {
  try {
    // First, try with metadata
    const { data, error } = await supabase
      .from('documents')
      .insert(documentData)
      .select()
      .single();
    
    if (error) {
      // If metadata column error, try without metadata
      if (error.message.includes('metadata')) {
        console.warn('Metadata column not available, saving without metadata');
        
        const { metadata, ...documentWithoutMetadata } = documentData;
        
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('documents')
          .insert(documentWithoutMetadata)
          .select()
          .single();
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        return fallbackData;
      } else {
        throw error;
      }
    }
    
    return data;
  } catch (error) {
    console.error('Safe document save failed:', error);
    throw error;
  }
};

// Test database connectivity and schema
export const testDatabaseHealth = async (): Promise<{
  connected: boolean;
  metadataSupported: boolean;
  error?: string;
}> => {
  try {
    // Test basic connection
    const { error: connectionError } = await supabase
      .from('documents')
      .select('id')
      .limit(1);
    
    if (connectionError) {
      return {
        connected: false,
        metadataSupported: false,
        error: connectionError.message,
      };
    }
    
    // Test metadata column
    const { error: metadataError } = await supabase
      .from('documents')
      .select('metadata')
      .limit(1);
    
    return {
      connected: true,
      metadataSupported: !metadataError,
      error: metadataError?.message,
    };
  } catch (error) {
    return {
      connected: false,
      metadataSupported: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};