import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { mergeDocuments } from "@/lib/supabase";

const DocumentSchema = z.object({
  id: z.string(),
  user_id: z.string(),
  title: z.string(),
  file_url: z.string(),
  thumbnail_url: z.string().nullable(),
  ocr_text: z.string().optional(),
  ocr_processed: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
  ai_processed: z.boolean().optional(),
  page_count: z.number().optional(),
  parent_document_id: z.string().nullable().optional(),
  page_order: z.number().optional(),
  receipt_data: z.any().optional(),
  receipt_processed: z.boolean().optional(),
  is_signed: z.boolean().optional(),
  signed_document_url: z.string().nullable().optional(),
  signature_data: z.any().optional(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const mergeDocumentsProcedure = protectedProcedure
  .input(
    z.object({
      documents: z.array(DocumentSchema),
      newTitle: z.string(),
      userId: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const mergedDocument = await mergeDocuments(
        input.documents,
        input.newTitle,
        input.userId
      );
      return {
        success: true,
        document: mergedDocument,
      };
    } catch (error) {
      console.error('Error merging documents:', error);
      throw new Error('Failed to merge documents');
    }
  });