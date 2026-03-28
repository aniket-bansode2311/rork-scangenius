import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { deleteDocument } from "@/lib/supabase";

export const deleteDocumentProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      fileUrl: z.string(),
      thumbnailUrl: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await deleteDocument(input.documentId, input.fileUrl, input.thumbnailUrl);
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error deleting document:', error);
      throw new Error('Failed to delete document');
    }
  });