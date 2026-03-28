import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { processDocumentAI } from "@/lib/supabase";

export const processAIProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      ocrText: z.string(),
      currentTitle: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await processDocumentAI(input.documentId, input.ocrText, input.currentTitle);
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error processing AI:', error);
      throw new Error('Failed to process AI');
    }
  });