import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { ImageAnnotatorClient } from '@google-cloud/vision';
import { supabase } from "@/lib/supabase";
import { Platform } from 'react-native';
import { SUPPORTED_LANGUAGES } from '@/constants/languages';

// Initialize Google Cloud Vision client
const getVisionClient = () => {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_CLOUD_VISION_API_KEY;
  if (!apiKey || apiKey === 'your-google-cloud-vision-api-key') {
    throw new Error('Google Cloud Vision API key not configured');
  }
  
  return new ImageAnnotatorClient({
    apiKey: apiKey,
  });
};

// Helper function to convert image URL/URI to base64
const getImageBase64 = async (imageUri: string): Promise<string> => {
  try {
    if (imageUri.startsWith('data:')) {
      // Already a data URL, extract base64 part
      return imageUri.split(',')[1];
    }
    
    if (imageUri.startsWith('http')) {
      // Fetch from URL
      const response = await fetch(imageUri);
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return buffer.toString('base64');
    }
    
    // For file system paths, this would need platform-specific handling
    throw new Error('Unsupported image URI format');
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error('Failed to process image');
  }
};

// Process OCR using Google Cloud Vision with language support
const processGoogleCloudVisionOCR = async (imageUri: string, languageHints?: string[]) => {
  try {
    const client = getVisionClient();
    const base64Image = await getImageBase64(imageUri);
    
    const request = {
      image: {
        content: base64Image,
      },
      features: [
        {
          type: 'TEXT_DETECTION' as const,
          maxResults: 1,
        },
        {
          type: 'DOCUMENT_TEXT_DETECTION' as const,
          maxResults: 1,
        },
      ],
      imageContext: languageHints && languageHints.length > 0 && !languageHints.includes('auto') ? {
        languageHints: languageHints.filter(lang => lang !== 'auto')
      } : undefined,
    };
    
    console.log('Sending request to Google Cloud Vision API...');
    const [result] = await client.annotateImage(request);
    
    if (result.error) {
      console.error('Google Cloud Vision API error:', result.error);
      throw new Error(`Vision API error: ${result.error.message}`);
    }
    
    // Extract text from the response
    let extractedText = '';
    let confidence = 0;
    
    if (result.fullTextAnnotation) {
      extractedText = result.fullTextAnnotation.text || '';
      
      // Calculate average confidence from pages
      if (result.fullTextAnnotation.pages && result.fullTextAnnotation.pages.length > 0) {
        const confidences = result.fullTextAnnotation.pages
          .flatMap(page => page.blocks || [])
          .flatMap(block => block.paragraphs || [])
          .flatMap(paragraph => paragraph.words || [])
          .map(word => word.confidence || 0)
          .filter(conf => conf > 0);
        
        if (confidences.length > 0) {
          confidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length;
        }
      }
    } else if (result.textAnnotations && result.textAnnotations.length > 0) {
      // Fallback to text annotations
      extractedText = result.textAnnotations[0].description || '';
      confidence = result.textAnnotations[0].confidence || 0;
    }
    
    // Detect language from the result
    let detectedLanguage = 'unknown';
    if (result.fullTextAnnotation && result.fullTextAnnotation.pages && result.fullTextAnnotation.pages.length > 0) {
      const page = result.fullTextAnnotation.pages[0];
      if (page.property && page.property.detectedLanguages && page.property.detectedLanguages.length > 0) {
        detectedLanguage = page.property.detectedLanguages[0].languageCode || 'unknown';
      }
    }
    
    console.log('OCR processing completed:', {
      textLength: extractedText.length,
      confidence: confidence,
      detectedLanguage: detectedLanguage,
      languageHints: languageHints,
      hasFullTextAnnotation: !!result.fullTextAnnotation,
      textAnnotationsCount: result.textAnnotations?.length || 0
    });
    
    return {
      text: extractedText.trim(),
      confidence: confidence,
      detectedLanguage: detectedLanguage,
      rawResult: result
    };
  } catch (error) {
    console.error('Error in Google Cloud Vision OCR:', error);
    throw error;
  }
};

export const processOCRProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      imageUri: z.string(),
      forceReprocess: z.boolean().optional().default(false),
      languageHints: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('Processing OCR for document:', input.documentId);
      
      // Check if document exists and belongs to user
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('id, ocr_processed, ocr_text, user_id, title')
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id)
        .single();
      
      if (fetchError || !document) {
        console.error('Document not found or access denied:', fetchError);
        throw new Error('Document not found or access denied');
      }
      
      // Skip if already processed and not forcing reprocess
      if (document.ocr_processed && !input.forceReprocess) {
        console.log('Document already processed, skipping OCR');
        return {
          success: true,
          text: document.ocr_text || '',
          alreadyProcessed: true
        };
      }
      
      // Process OCR using Google Cloud Vision with language hints
      const ocrResult = await processGoogleCloudVisionOCR(input.imageUri, input.languageHints);
      
      // Update document with OCR results including detected language
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          ocr_text: ocrResult.text,
          ocr_processed: true,
          ocr_language: ocrResult.detectedLanguage,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id);
      
      if (updateError) {
        console.error('Error updating document with OCR text:', updateError);
        throw new Error('Failed to save OCR results');
      }
      
      console.log('OCR processing completed successfully:', {
        documentId: input.documentId,
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence
      });
      
      // Check if this looks like a receipt and trigger automatic extraction
      let receiptExtractionResult = null;
      if (ocrResult.text && ocrResult.text.length > 20) {
        try {
          const receiptCheckResponse = await fetch('https://toolkit.rork.com/text/llm/', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messages: [
                {
                  role: 'user',
                  content: `Analyze the following OCR text and determine if it appears to be from a receipt or invoice. Look for indicators like business names, prices, totals, dates, payment methods, etc.

OCR Text:
${ocrResult.text}

Respond with only "YES" if this appears to be a receipt/invoice, or "NO" if it doesn't.`
                }
              ]
            })
          });
          
          if (receiptCheckResponse.ok) {
            const checkResult = await receiptCheckResponse.json();
            const isReceipt = checkResult.completion?.trim().toUpperCase() === 'YES';
            
            if (isReceipt) {
              console.log('Document appears to be a receipt, triggering automatic extraction...');
              
              // Trigger receipt extraction
              const extractionResponse = await fetch('https://toolkit.rork.com/text/llm/', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  messages: [
                    {
                      role: 'user',
                      content: `You are an expert at extracting structured data from receipt text. Analyze the following OCR text from a receipt and extract key information in JSON format.

OCR Text:
${ocrResult.text}

Please extract the following information and return it as a valid JSON object:
{
  "vendor_name": "Business name",
  "vendor_address": "Full address if available",
  "vendor_phone": "Phone number if available",
  "total_amount": 0.00,
  "subtotal": 0.00,
  "tax_amount": 0.00,
  "tip_amount": 0.00,
  "date": "YYYY-MM-DD format if available",
  "time": "HH:MM format if available",
  "receipt_number": "Receipt/transaction number if available",
  "payment_method": "Cash/Card/etc if available",
  "currency": "USD or other currency code",
  "line_items": [
    {
      "description": "Item description",
      "quantity": 1,
      "unit_price": 0.00,
      "total_price": 0.00
    }
  ]
}

Rules:
1. Only include fields where you can confidently extract the information
2. For amounts, use numbers (not strings)
3. For dates, use YYYY-MM-DD format
4. For times, use HH:MM format (24-hour)
5. If you can't find a field, omit it from the JSON
6. Be conservative - only include data you're confident about
7. For line items, try to extract individual products/services with their prices
8. Return ONLY the JSON object, no additional text

If the text doesn't appear to be from a receipt, return: {"error": "Not a receipt"}`
                    }
                  ]
                })
              });
              
              if (extractionResponse.ok) {
                const aiResult = await extractionResponse.json();
                
                if (aiResult.completion) {
                  try {
                    const cleanedResponse = aiResult.completion.trim();
                    
                    if (!cleanedResponse.includes('"error": "Not a receipt"')) {
                      const receiptData = JSON.parse(cleanedResponse);
                      
                      // Add metadata
                      receiptData.extracted_at = new Date().toISOString();
                      
                      // Calculate confidence score
                      let score = 0;
                      let maxScore = 0;
                      
                      maxScore += 20;
                      if (receiptData.vendor_name) score += 20;
                      
                      maxScore += 20;
                      if (receiptData.total_amount && receiptData.total_amount > 0) score += 20;
                      
                      maxScore += 15;
                      if (receiptData.date) score += 15;
                      
                      maxScore += 15;
                      if (receiptData.line_items && receiptData.line_items.length > 0) score += 15;
                      
                      maxScore += 10;
                      if (receiptData.subtotal && receiptData.subtotal > 0) score += 5;
                      if (receiptData.tax_amount && receiptData.tax_amount > 0) score += 5;
                      
                      maxScore += 20;
                      if (receiptData.vendor_address) score += 5;
                      if (receiptData.vendor_phone) score += 5;
                      if (receiptData.time) score += 5;
                      if (receiptData.receipt_number) score += 5;
                      
                      receiptData.confidence_score = Math.round((score / maxScore) * 100);
                      
                      // Update document with receipt data
                      const { error: receiptUpdateError } = await supabase
                        .from('documents')
                        .update({
                          receipt_data: receiptData,
                          receipt_processed: true,
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', input.documentId)
                        .eq('user_id', ctx.user.id);
                      
                      if (!receiptUpdateError) {
                        receiptExtractionResult = receiptData;
                        console.log('Receipt data extracted and saved automatically');
                      }
                    }
                  } catch (parseError) {
                    console.error('Error parsing receipt data:', parseError);
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error('Error in automatic receipt extraction:', error);
          // Don't fail the OCR process if receipt extraction fails
        }
      }
      
      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        detectedLanguage: ocrResult.detectedLanguage,
        alreadyProcessed: false,
        receiptData: receiptExtractionResult
      };
    } catch (error) {
      console.error('Error processing OCR:', error);
      
      // Mark as processed even if failed to avoid infinite retries
      await supabase
        .from('documents')
        .update({ 
          ocr_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id);
      
      const errorMessage = error instanceof Error ? error.message : 'Failed to process OCR';
      throw new Error(errorMessage);
    }
  });

export const reprocessOCRProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      imageUri: z.string(),
      languageHints: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('Reprocessing OCR for document:', input.documentId);
      
      // Check if document exists and belongs to user
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id)
        .single();
      
      if (fetchError || !document) {
        console.error('Document not found or access denied:', fetchError);
        throw new Error('Document not found or access denied');
      }
      
      // Process OCR using Google Cloud Vision with language hints
      const ocrResult = await processGoogleCloudVisionOCR(input.imageUri, input.languageHints);
      
      // Update document with new OCR results including detected language
      const { error: updateError } = await supabase
        .from('documents')
        .update({
          ocr_text: ocrResult.text,
          ocr_processed: true,
          ocr_language: ocrResult.detectedLanguage,
          updated_at: new Date().toISOString()
        })
        .eq('id', input.documentId)
        .eq('user_id', ctx.user.id);
      
      if (updateError) {
        console.error('Error updating document with reprocessed OCR text:', updateError);
        throw new Error('Failed to save reprocessed OCR results');
      }
      
      console.log('OCR reprocessing completed successfully:', {
        documentId: input.documentId,
        textLength: ocrResult.text.length,
        confidence: ocrResult.confidence
      });
      
      return {
        success: true,
        text: ocrResult.text,
        confidence: ocrResult.confidence,
        detectedLanguage: ocrResult.detectedLanguage
      };
    } catch (error) {
      console.error('Error reprocessing OCR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to reprocess OCR';
      throw new Error(errorMessage);
    }
  });

// Batch OCR processing for multiple documents
export const batchProcessOCRProcedure = protectedProcedure
  .input(
    z.object({
      documents: z.array(z.object({
        documentId: z.string(),
        imageUri: z.string(),
      })),
      maxConcurrent: z.number().min(1).max(5).default(3),
    })
  )
  .mutation(async ({ input, ctx }) => {
    try {
      console.log('Batch processing OCR for', input.documents.length, 'documents');
      
      const results = [];
      const errors = [];
      
      // Process documents in batches to respect rate limits
      for (let i = 0; i < input.documents.length; i += input.maxConcurrent) {
        const batch = input.documents.slice(i, i + input.maxConcurrent);
        
        const batchPromises = batch.map(async (doc) => {
          try {
            // Check document ownership
            const { data: document, error: fetchError } = await supabase
              .from('documents')
              .select('id, ocr_processed, user_id')
              .eq('id', doc.documentId)
              .eq('user_id', ctx.user.id)
              .single();
            
            if (fetchError || !document) {
              throw new Error('Document not found or access denied');
            }
            
            if (document.ocr_processed) {
              return {
                documentId: doc.documentId,
                success: true,
                skipped: true,
                reason: 'Already processed'
              };
            }
            
            const ocrResult = await processGoogleCloudVisionOCR(doc.imageUri);
            
            await supabase
              .from('documents')
              .update({
                ocr_text: ocrResult.text,
                ocr_processed: true,
                ocr_language: ocrResult.detectedLanguage,
                updated_at: new Date().toISOString()
              })
              .eq('id', doc.documentId)
              .eq('user_id', ctx.user.id);
            
            return {
              documentId: doc.documentId,
              success: true,
              textLength: ocrResult.text.length,
              confidence: ocrResult.confidence
            };
          } catch (error) {
            console.error(`Error processing OCR for document ${doc.documentId}:`, error);
            return {
              documentId: doc.documentId,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error'
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults.filter(r => r.success));
        errors.push(...batchResults.filter(r => !r.success));
        
        // Add delay between batches to respect rate limits
        if (i + input.maxConcurrent < input.documents.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      console.log('Batch OCR processing completed:', {
        total: input.documents.length,
        successful: results.length,
        failed: errors.length
      });
      
      return {
        success: true,
        results,
        errors,
        summary: {
          total: input.documents.length,
          successful: results.length,
          failed: errors.length
        }
      };
    } catch (error) {
      console.error('Error in batch OCR processing:', error);
      throw new Error('Failed to process batch OCR');
    }
  });