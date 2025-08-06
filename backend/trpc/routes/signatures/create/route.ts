import { z } from "zod";
import { protectedProcedure } from "../../../create-context";
import { supabase } from "@/lib/supabase";

export const createSignatureProcedure = protectedProcedure
  .input(
    z.object({
      userId: z.string(),
      name: z.string(),
      signatureData: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    try {
      const { data, error } = await supabase
        .from('signatures')
        .insert({
          user_id: input.userId,
          name: input.name,
          signature_data: input.signatureData,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

      return {
        success: true,
        signature: data,
      };
    } catch (error) {
      console.error('Error creating signature:', error);
      throw new Error('Failed to create signature');
    }
  });