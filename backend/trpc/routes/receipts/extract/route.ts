import { z } from 'zod';
import { procedure } from '../../../create-context'; // Changed from protectedProcedure

// Define the context type (adjust based on your actual context structure)
interface TRPCContext {
  user: {
    id: string;
  };
  supabase: any; // Type this properly based on your Supabase client
}

export const extractReceiptProcedure = procedure
  .input(z.object({
    documentId: z.string().uuid(),
    ocrText: z.string().min(1)
  }))
  .mutation(async ({ input, ctx }: { input: { documentId: string; ocrText: string }, ctx: TRPCContext }) => {
    const { documentId, ocrText } = input;
    const userId = ctx.user.id;

    try {
      // Verify document ownership
      const { data: document, error: fetchError } = await ctx.supabase
        .from('documents')
        .select('id, user_id, ocr_text')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Extract receipt data using AI
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
${ocrText}

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

      if (!extractionResponse.ok) {
        throw new Error(`AI API request failed: ${extractionResponse.status}`);
      }

      const aiResult = await extractionResponse.json();
      
      if (!aiResult.completion) {
        throw new Error('No completion received from AI API');
      }

      let receiptData: any;
      try {
        const cleanedResponse = aiResult.completion.trim();
        
        if (cleanedResponse.includes('"error": "Not a receipt"')) {
          throw new Error('The document does not appear to be a receipt');
        }

        receiptData = JSON.parse(cleanedResponse);
        
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

      } catch (parseError) {
        throw new Error('Failed to parse extracted receipt data');
      }

      // Update document with receipt data
      const { error: updateError } = await ctx.supabase
        .from('documents')
        .update({
          receipt_data: receiptData,
          receipt_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to save receipt data');
      }

      return {
        success: true,
        data: receiptData
      };

    } catch (error) {
      console.error('Receipt extraction error:', error);
      
      // Mark as processed even if failed to avoid repeated attempts
      await ctx.supabase
        .from('documents')
        .update({
          receipt_processed: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', userId);

      throw new Error(error instanceof Error ? error.message : 'Receipt extraction failed');
    }
  });