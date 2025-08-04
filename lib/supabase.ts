import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@/constants/config';
import { Database } from '@/types/supabase';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { extractTextFromImage, isOCRConfigured, OCRResult } from '@/lib/ocr';
import { analyzeDocumentContent } from '@/lib/ai-organization';

// Create Supabase client with AsyncStorage for session persistence
export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Document storage utilities
export interface DocumentUploadResult {
  fileUrl: string;
  thumbnailUrl: string;
  fileName: string;
  thumbnailName: string;
}

export interface Document {
  id: string;
  user_id: string;
  title: string;
  file_url: string;
  thumbnail_url?: string;
  ocr_text?: string;
  ocr_processed: boolean;
  created_at: string;
  updated_at: string;
}

export interface SaveDocumentParams {
  title: string;
  imageUri: string;
  userId: string;
  ocrText?: string;
  tags?: string[];
}

// Generate thumbnail from image
export const generateThumbnail = async (imageUri: string): Promise<string> => {
  try {
    console.log('Generating thumbnail for:', imageUri);
    
    if (Platform.OS === 'web') {
      // For web, return the original image as thumbnail
      // In a real app, you'd use canvas to resize
      return imageUri;
    }
    
    // For mobile, we'll simulate thumbnail generation
    // In a real app, you'd use expo-image-manipulator
    return imageUri;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  }
};

// Upload image to Supabase Storage
export const uploadImageToStorage = async (
  imageUri: string,
  fileName: string,
  bucket: string = 'scans'
): Promise<string> => {
  try {
    console.log('Uploading image to storage:', { imageUri, fileName, bucket });
    
    let fileData: any;
    
    if (Platform.OS === 'web') {
      // For web, convert data URL to blob
      const response = await fetch(imageUri);
      fileData = await response.blob();
    } else {
      // For mobile, read file as base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Convert base64 to blob-like object
      const byteCharacters = atob(base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      fileData = new Blob([byteArray], { type: 'image/jpeg' });
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, fileData, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);
    
    console.log('Image uploaded successfully:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
};

// Save document to database with OCR processing
export const saveDocumentToDatabase = async (params: SaveDocumentParams): Promise<Document> => {
  try {
    console.log('Saving document to database:', params);
    
    const timestamp = Date.now();
    const fileName = `document_${timestamp}.jpg`;
    const thumbnailName = `thumbnail_${timestamp}.jpg`;
    
    // Generate thumbnail
    const thumbnailUri = await generateThumbnail(params.imageUri);
    
    // Upload both images to storage
    const [fileUrl, thumbnailUrl] = await Promise.all([
      uploadImageToStorage(params.imageUri, fileName),
      uploadImageToStorage(thumbnailUri, thumbnailName)
    ]);
    
    // Save document metadata to database
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: params.userId,
        title: params.title,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        ocr_text: params.ocrText || null,
        ocr_processed: !!params.ocrText,
        tags: params.tags || [],
        ai_processed: false
      })
      .select()
      .single();
    
    if (error) {
      console.error('Database insert error:', error);
      throw error;
    }
    
    console.log('Document saved successfully:', data);
    
    // If OCR text is provided and tags are not, trigger AI processing in background
    if (params.ocrText && (!params.tags || params.tags.length === 0)) {
      processDocumentAI(data.id, params.ocrText, params.title).catch(error => {
        console.error('Background AI processing failed:', error);
      });
    } else if (!params.ocrText) {
      // Process OCR in background if not provided
      processDocumentOCR(data.id, params.imageUri).catch(error => {
        console.error('Background OCR processing failed:', error);
      });
    }
    
    return data as Document;
  } catch (error) {
    console.error('Error saving document:', error);
    throw error;
  }
};

// Fetch user documents
export const fetchUserDocuments = async (userId: string) => {
  try {
    console.log('Fetching documents for user:', userId);
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching documents:', error);
      throw error;
    }
    
    console.log('Documents fetched successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching documents:', error);
    throw error;
  }
};

// Process AI organization for a document
export const processDocumentAI = async (documentId: string, ocrText: string, currentTitle: string): Promise<void> => {
  try {
    console.log('Processing AI organization for document:', documentId);
    
    const aiResult = await analyzeDocumentContent({
      text: ocrText,
      currentTitle
    });
    
    // Update document with AI-generated tags and improved title
    const { error } = await supabase
      .from('documents')
      .update({
        tags: aiResult.suggestedTags,
        ai_processed: true
      })
      .eq('id', documentId);
    
    if (error) {
      console.error('Error updating document with AI suggestions:', error);
      throw error;
    }
    
    console.log('AI processing completed for document:', documentId, {
      tagsCount: aiResult.suggestedTags.length,
      confidence: aiResult.confidence
    });
  } catch (error) {
    console.error('Error processing AI organization:', error);
    
    // Mark as processed even if failed to avoid infinite retries
    await supabase
      .from('documents')
      .update({ ai_processed: true })
      .eq('id', documentId);
    
    throw error;
  }
};

// Process OCR for a document
export const processDocumentOCR = async (documentId: string, imageUri: string): Promise<void> => {
  try {
    console.log('Processing OCR for document:', documentId);
    
    const isConfigured = await isOCRConfigured();
    if (!isConfigured) {
      console.log('OCR not configured, skipping OCR processing');
      return;
    }
    
    const ocrResult = await extractTextFromImage(imageUri);
    
    // Update document with OCR text
    const { error } = await supabase
      .from('documents')
      .update({
        ocr_text: ocrResult.text,
        ocr_processed: true
      })
      .eq('id', documentId);
    
    if (error) {
      console.error('Error updating document with OCR text:', error);
      throw error;
    }
    
    console.log('OCR processing completed for document:', documentId, {
      textLength: ocrResult.text.length,
      confidence: ocrResult.confidence
    });
    
    // Trigger AI processing after OCR is complete
    if (ocrResult.text && ocrResult.text.trim().length > 0) {
      // Get current document title for AI processing
      const { data: document } = await supabase
        .from('documents')
        .select('title')
        .eq('id', documentId)
        .single();
      
      if (document) {
        processDocumentAI(documentId, ocrResult.text, document.title).catch(error => {
          console.error('Background AI processing failed:', error);
        });
      }
    }
  } catch (error) {
    console.error('Error processing OCR:', error);
    
    // Mark as processed even if failed to avoid infinite retries
    await supabase
      .from('documents')
      .update({ ocr_processed: true })
      .eq('id', documentId);
    
    throw error;
  }
};

// Search documents by text content
export const searchDocuments = async (userId: string, query: string): Promise<Document[]> => {
  try {
    console.log('Searching documents for user:', userId, 'query:', query);
    
    if (!query.trim()) {
      return fetchUserDocuments(userId);
    }
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,ocr_text.ilike.%${query}%,tags.cs.{"${query}"}`)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
    
    console.log('Search completed:', data?.length || 0, 'documents found');
    return data || [];
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
};

// Get OCR text for a document
export const getDocumentOCRText = async (documentId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('ocr_text, ocr_processed')
      .eq('id', documentId)
      .single();
    
    if (error) {
      console.error('Error fetching OCR text:', error);
      throw error;
    }
    
    return data?.ocr_text || null;
  } catch (error) {
    console.error('Error getting document OCR text:', error);
    throw error;
  }
};

// Reprocess OCR for a document
export const reprocessDocumentOCR = async (documentId: string, imageUri: string): Promise<OCRResult> => {
  try {
    console.log('Reprocessing OCR for document:', documentId);
    
    const isConfigured = await isOCRConfigured();
    if (!isConfigured) {
      throw new Error('OCR not configured');
    }
    
    const ocrResult = await extractTextFromImage(imageUri);
    
    // Update document with new OCR text
    const { error } = await supabase
      .from('documents')
      .update({
        ocr_text: ocrResult.text,
        ocr_processed: true
      })
      .eq('id', documentId);
    
    if (error) {
      console.error('Error updating document with reprocessed OCR text:', error);
      throw error;
    }
    
    console.log('OCR reprocessing completed for document:', documentId);
    return ocrResult;
  } catch (error) {
    console.error('Error reprocessing OCR:', error);
    throw error;
  }
};

// Delete document
export const deleteDocument = async (documentId: string, fileUrl: string, thumbnailUrl: string) => {
  try {
    console.log('Deleting document:', documentId);
    
    // Extract file names from URLs
    const fileName = fileUrl.split('/').pop();
    const thumbnailName = thumbnailUrl.split('/').pop();
    
    // Delete files from storage
    if (fileName) {
      await supabase.storage.from('scans').remove([fileName]);
    }
    if (thumbnailName) {
      await supabase.storage.from('scans').remove([thumbnailName]);
    }
    
    // Delete document from database
    const { error } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
    
    if (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
    
    console.log('Document deleted successfully');
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
};

// Advanced document editing operations

// Merge multiple documents into a single document
export const mergeDocuments = async (
  documents: Document[],
  newTitle: string,
  userId: string
): Promise<Document> => {
  try {
    console.log('Merging documents:', documents.map(d => d.id));
    
    if (documents.length < 2) {
      throw new Error('At least 2 documents are required for merging');
    }
    
    const timestamp = Date.now();
    const fileName = `merged_document_${timestamp}.jpg`;
    const thumbnailName = `merged_thumbnail_${timestamp}.jpg`;
    
    // For now, use the first document's image as the merged image
    // In a real implementation, you'd combine the images
    const primaryDocument = documents[0];
    
    // Upload the merged document (using first document's image for now)
    const [fileUrl, thumbnailUrl] = await Promise.all([
      uploadImageToStorage(primaryDocument.file_url, fileName),
      uploadImageToStorage(primaryDocument.thumbnail_url || primaryDocument.file_url, thumbnailName)
    ]);
    
    // Combine OCR text from all documents
    const combinedOcrText = documents
      .map(doc => doc.ocr_text || '')
      .filter(text => text.trim())
      .join('\n\n--- Page Break ---\n\n');
    
    // Create the merged document
    const { data, error } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        title: newTitle,
        file_url: fileUrl,
        thumbnail_url: thumbnailUrl,
        ocr_text: combinedOcrText,
        ocr_processed: true,
        page_count: documents.length
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error creating merged document:', error);
      throw error;
    }
    
    // Update original documents to reference the merged document
    for (let i = 0; i < documents.length; i++) {
      await supabase
        .from('documents')
        .update({
          parent_document_id: data.id,
          page_order: i + 1
        })
        .eq('id', documents[i].id);
    }
    
    console.log('Documents merged successfully:', data.id);
    return data as Document;
  } catch (error) {
    console.error('Error merging documents:', error);
    throw error;
  }
};

// Split a multi-page document into individual documents
export const splitDocument = async (
  document: Document,
  splitPoints: number[], // Array of page numbers where to split
  newTitles: string[]
): Promise<Document[]> => {
  try {
    console.log('Splitting document:', document.id, 'at points:', splitPoints);
    
    if (!document.page_count || document.page_count <= 1) {
      throw new Error('Document must have multiple pages to split');
    }
    
    // Get child documents (pages) of the multi-page document
    const { data: childDocuments, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('parent_document_id', document.id)
      .order('page_order');
    
    if (fetchError) {
      console.error('Error fetching child documents:', fetchError);
      throw fetchError;
    }
    
    if (!childDocuments || childDocuments.length === 0) {
      throw new Error('No child documents found for splitting');
    }
    
    const splitDocuments: Document[] = [];
    let currentPageIndex = 0;
    
    for (let i = 0; i < splitPoints.length; i++) {
      const endPage = splitPoints[i];
      const pagesToInclude = childDocuments.slice(currentPageIndex, endPage);
      
      if (pagesToInclude.length === 0) continue;
      
      // Create new document for this split
      const timestamp = Date.now() + i;
      const fileName = `split_document_${timestamp}.jpg`;
      const thumbnailName = `split_thumbnail_${timestamp}.jpg`;
      
      // Use first page as the main image
      const primaryPage = pagesToInclude[0];
      
      const [fileUrl, thumbnailUrl] = await Promise.all([
        uploadImageToStorage(primaryPage.file_url, fileName),
        uploadImageToStorage(primaryPage.thumbnail_url || primaryPage.file_url, thumbnailName)
      ]);
      
      // Combine OCR text from included pages
      const combinedOcrText = pagesToInclude
        .map(page => page.ocr_text || '')
        .filter(text => text.trim())
        .join('\n\n--- Page Break ---\n\n');
      
      const { data: newDocument, error } = await supabase
        .from('documents')
        .insert({
          user_id: document.user_id,
          title: newTitles[i] || `${document.title} - Part ${i + 1}`,
          file_url: fileUrl,
          thumbnail_url: thumbnailUrl,
          ocr_text: combinedOcrText,
          ocr_processed: true,
          page_count: pagesToInclude.length
        })
        .select()
        .single();
      
      if (error) {
        console.error('Error creating split document:', error);
        throw error;
      }
      
      splitDocuments.push(newDocument as Document);
      currentPageIndex = endPage;
    }
    
    console.log('Document split successfully into', splitDocuments.length, 'documents');
    return splitDocuments;
  } catch (error) {
    console.error('Error splitting document:', error);
    throw error;
  }
};

// Reorder pages within a multi-page document
export const reorderDocumentPages = async (
  documentId: string,
  newPageOrder: string[] // Array of child document IDs in new order
): Promise<void> => {
  try {
    console.log('Reordering pages for document:', documentId, 'new order:', newPageOrder);
    
    // Update page_order for each child document
    for (let i = 0; i < newPageOrder.length; i++) {
      const { error } = await supabase
        .from('documents')
        .update({ page_order: i + 1 })
        .eq('id', newPageOrder[i])
        .eq('parent_document_id', documentId);
      
      if (error) {
        console.error('Error updating page order:', error);
        throw error;
      }
    }
    
    console.log('Pages reordered successfully');
  } catch (error) {
    console.error('Error reordering pages:', error);
    throw error;
  }
};

// Get child documents (pages) of a multi-page document
export const getDocumentPages = async (documentId: string): Promise<Document[]> => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('parent_document_id', documentId)
      .order('page_order');
    
    if (error) {
      console.error('Error fetching document pages:', error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error('Error getting document pages:', error);
    throw error;
  }
};

// Delete multiple documents
export const deleteMultipleDocuments = async (documents: Document[]): Promise<void> => {
  try {
    console.log('Deleting multiple documents:', documents.map(d => d.id));
    
    // Delete each document
    for (const document of documents) {
      await deleteDocument(document.id, document.file_url, document.thumbnail_url || '');
    }
    
    console.log('Multiple documents deleted successfully');
  } catch (error) {
    console.error('Error deleting multiple documents:', error);
    throw error;
  }
};