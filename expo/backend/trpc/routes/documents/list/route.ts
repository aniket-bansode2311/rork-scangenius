import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { fetchUserDocuments } from "@/lib/supabase";

export const listDocumentsProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const documents = await fetchUserDocuments(input.userId);
      return {
        success: true,
        documents,
      };
    } catch (error) {
      console.error('Error fetching documents:', error);
      throw new Error('Failed to fetch documents');
    }
  });