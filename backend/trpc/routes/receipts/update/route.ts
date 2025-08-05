import { z } from 'zod';
import { protectedProcedure } from '../../../create-context';

const ReceiptLineItemSchema = z.object({
  description: z.string(),
  quantity: z.number().optional(),
  unit_price: z.number().optional(),
  total_price: z.number().optional()
});

const ReceiptDataSchema = z.object({
  vendor_name: z.string().optional(),
  vendor_address: z.string().optional(),
  vendor_phone: z.string().optional(),
  total_amount: z.number().optional(),
  subtotal: z.number().optional(),
  tax_amount: z.number().optional(),
  tip_amount: z.number().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  receipt_number: z.string().optional(),
  payment_method: z.string().optional(),
  line_items: z.array(ReceiptLineItemSchema).optional(),
  currency: z.string().optional(),
  confidence_score: z.number().optional(),
  extracted_at: z.string().optional()
});

export const updateReceiptProcedure = protectedProcedure
  .input(z.object({
    documentId: z.string().uuid(),
    receiptData: ReceiptDataSchema
  }))
  .mutation(async ({ input, ctx }) => {
    const { documentId, receiptData } = input;
    const userId = ctx.user.id;

    try {
      // Verify document ownership
      const { data: document, error: fetchError } = await ctx.supabase
        .from('documents')
        .select('id, user_id')
        .eq('id', documentId)
        .eq('user_id', userId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found or access denied');
      }

      // Update receipt data
      const { error: updateError } = await ctx.supabase
        .from('documents')
        .update({
          receipt_data: receiptData,
          updated_at: new Date().toISOString()
        })
        .eq('id', documentId)
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update receipt data');
      }

      return {
        success: true,
        message: 'Receipt data updated successfully'
      };

    } catch (error) {
      console.error('Receipt update error:', error);
      throw new Error(error instanceof Error ? error.message : 'Failed to update receipt data');
    }
  });