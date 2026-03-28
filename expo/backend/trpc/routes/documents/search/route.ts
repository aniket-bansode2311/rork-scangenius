import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { searchDocuments } from "@/lib/supabase";

export const searchDocumentsProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
      query: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const documents = await searchDocuments(input.userId, input.query);
      return {
        success: true,
        documents,
      };
    } catch (error) {
      console.error('Error searching documents:', error);
      throw new Error('Failed to search documents');
    }
  });