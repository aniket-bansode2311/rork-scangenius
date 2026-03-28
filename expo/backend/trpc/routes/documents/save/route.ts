import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { saveDocumentToDatabase } from "@/lib/supabase";

export const saveDocumentProcedure = protectedProcedure
  .input(
    z.object({
      title: z.string(),
      imageUri: z.string(),
      userId: z.string(),
      ocrText: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const document = await saveDocumentToDatabase(input);
      return {
        success: true,
        document,
      };
    } catch (error) {
      console.error('Error saving document:', error);
      throw new Error('Failed to save document');
    }
  });