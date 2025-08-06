import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { processDocumentOCR, reprocessDocumentOCR } from "@/lib/supabase";

export const processOCRProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      imageUri: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await processDocumentOCR(input.documentId, input.imageUri);
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error processing OCR:', error);
      throw new Error('Failed to process OCR');
    }
  });

export const reprocessOCRProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      imageUri: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const result = await reprocessDocumentOCR(input.documentId, input.imageUri);
      return {
        success: true,
        result,
      };
    } catch (error) {
      console.error('Error reprocessing OCR:', error);
      throw new Error('Failed to reprocess OCR');
    }
  });