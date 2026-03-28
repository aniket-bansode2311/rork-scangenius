import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { reorderDocumentPages } from "@/lib/supabase";

export const reorderDocumentPagesProcedure = protectedProcedure
  .input(
    z.object({
      documentId: z.string(),
      newPageOrder: z.array(z.string()),
    })
  )
  .mutation(async ({ input }) => {
    try {
      await reorderDocumentPages(input.documentId, input.newPageOrder);
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error reordering document pages:', error);
      throw new Error('Failed to reorder document pages');
    }
  });