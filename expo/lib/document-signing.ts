import { supabase, uploadImageToStorage } from '@/lib/supabase';
import { Document, SignatureData } from '@/types/supabase';
import { Platform } from 'react-native';

export interface SignDocumentParams {
  documentId: string;
  userId: string;
  signatureData: SignatureData[];
  originalImageUrl: string;
}

// Create a signed version of the document
export const signDocument = async (params: SignDocumentParams): Promise<Document> => {
  try {
    console.log('Signing document:', params.documentId);
    
    // For now, we'll create a simple signed document by updating the database
    // In a real implementation, you would:
    // 1. Download the original image
    // 2. Overlay the signatures at the specified positions
    // 3. Upload the new signed image to storage
    // 4. Update the document record
    
    const timestamp = Date.now();
    const signedFileName = `signed_document_${timestamp}.jpg`;
    
    // For this implementation, we'll use the original image as the signed version
    // and store the signature data in the database for rendering
    let signedDocumentUrl: string;
    
    if (Platform.OS === 'web') {
      // For web, we can create a composite image using Canvas API
      signedDocumentUrl = await createSignedImageWeb(params.originalImageUrl, params.signatureData);
    } else {
      // For mobile, we'll use the original image and overlay signatures in the UI
      signedDocumentUrl = params.originalImageUrl;
    }
    
    // Update the document with signature information
    const { data, error } = await supabase
      .from('documents')
      .update({
        is_signed: true,
        signed_document_url: signedDocumentUrl,
        signature_data: params.signatureData,
      })
      .eq('id', params.documentId)
      .eq('user_id', params.userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating document with signature:', error);
      throw error;
    }
    
    console.log('Document signed successfully:', data.id);
    return data as Document;
  } catch (error) {
    console.error('Error signing document:', error);
    throw error;
  }
};

// Create a signed image using Canvas API (web only)
const createSignedImageWeb = async (
  originalImageUrl: string, 
  signatureData: SignatureData[]
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }
      
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = async () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw the original image
        ctx.drawImage(img, 0, 0);
        
        // Load and draw each signature
        const signaturePromises = signatureData.map(async (sigData) => {
          return new Promise<void>((resolveSig, rejectSig) => {
            // Get the signature image from the database
            const fetchSignature = async () => {
              try {
                const { data: signature, error } = await supabase
                  .from('signatures')
                  .select('signature_data')
                  .eq('id', sigData.signature_id)
                  .single();
                
                if (error || !signature) {
                  rejectSig(error || new Error('Signature not found'));
                  return;
                }
                
                const sigImg = new Image();
                sigImg.crossOrigin = 'anonymous';
                
                sigImg.onload = () => {
                  // Calculate actual position and size
                  const x = sigData.x * canvas.width;
                  const y = sigData.y * canvas.height;
                  const width = sigData.width * canvas.width;
                  const height = sigData.height * canvas.height;
                  
                  // Save context for rotation
                  ctx.save();
                  
                  // Move to signature center and rotate
                  ctx.translate(x + width / 2, y + height / 2);
                  ctx.rotate((sigData.rotation || 0) * Math.PI / 180);
                  
                  // Draw signature centered at origin
                  ctx.drawImage(sigImg, -width / 2, -height / 2, width, height);
                  
                  // Restore context
                  ctx.restore();
                  
                  resolveSig();
                };
                
                sigImg.onerror = () => rejectSig(new Error('Failed to load signature image'));
                sigImg.src = signature.signature_data;
              } catch (error) {
                rejectSig(error as Error);
              }
            };
            
            fetchSignature();
          });
        });
        
        try {
          await Promise.all(signaturePromises);
          
          // Convert canvas to blob and upload
          canvas.toBlob(async (blob) => {
            if (!blob) {
              reject(new Error('Failed to create blob from canvas'));
              return;
            }
            
            try {
              // Convert blob to data URL for upload
              const reader = new FileReader();
              reader.onload = async () => {
                try {
                  const dataUrl = reader.result as string;
                  const timestamp = Date.now();
                  const fileName = `signed_document_${timestamp}.jpg`;
                  
                  const signedUrl = await uploadImageToStorage(dataUrl, fileName);
                  resolve(signedUrl);
                } catch (uploadError) {
                  reject(uploadError);
                }
              };
              reader.onerror = () => reject(new Error('Failed to read blob'));
              reader.readAsDataURL(blob);
            } catch (blobError) {
              reject(blobError);
            }
          }, 'image/jpeg', 0.9);
        } catch (signatureError) {
          reject(signatureError);
        }
      };
      
      img.onerror = () => reject(new Error('Failed to load original image'));
      img.src = originalImageUrl;
    } catch (error) {
      reject(error);
    }
  });
};

// Remove signature from a document
export const removeDocumentSignature = async (
  documentId: string, 
  userId: string
): Promise<Document> => {
  try {
    console.log('Removing signature from document:', documentId);
    
    const { data, error } = await supabase
      .from('documents')
      .update({
        is_signed: false,
        signed_document_url: null,
        signature_data: null,
      })
      .eq('id', documentId)
      .eq('user_id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('Error removing signature from document:', error);
      throw error;
    }
    
    console.log('Signature removed successfully from document:', data.id);
    return data as Document;
  } catch (error) {
    console.error('Error removing document signature:', error);
    throw error;
  }
};

// Get signed documents for a user
export const fetchSignedDocuments = async (userId: string): Promise<Document[]> => {
  try {
    console.log('Fetching signed documents for user:', userId);
    
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .eq('is_signed', true)
      .order('updated_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching signed documents:', error);
      throw error;
    }
    
    console.log('Signed documents fetched successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching signed documents:', error);
    throw error;
  }
};