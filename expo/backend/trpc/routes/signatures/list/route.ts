import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";

export const listSignaturesProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
    })
  )
  .query(async ({ input }) => {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .select('*')
        .eq('user_id', input.userId)
        .order('created_at', { ascending: false });

      if (error) {
        throw error;
      }

      return {
        success: true,
        signatures: data || [],
      };
    } catch (error) {
      console.error('Error fetching signatures:', error);
      throw new Error('Failed to fetch signatures');
    }
  });