import { supabase } from '@/lib/supabase';
import { Signature } from '@/types/supabase';

export interface CreateSignatureParams {
  user_id: string;
  name: string;
  signature_data: string;
}

export interface UpdateSignatureParams {
  name?: string;
  signature_data?: string;
}

// Fetch all signatures for a user
export const fetchUserSignatures = async (userId: string): Promise<Signature[]> => {
  try {
    console.log('Fetching signatures for user:', userId);
    
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching signatures:', error);
      throw error;
    }
    
    console.log('Signatures fetched successfully:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error fetching signatures:', error);
    throw error;
  }
};

// Save a new signature
export const saveSignature = async (params: CreateSignatureParams): Promise<Signature> => {
  try {
    console.log('Saving signature:', params.name);
    
    const { data, error } = await supabase
      .from('signatures')
      .insert({
        user_id: params.user_id,
        name: params.name,
        signature_data: params.signature_data,
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error saving signature:', error);
      throw error;
    }
    
    console.log('Signature saved successfully:', data.id);
    return data as Signature;
  } catch (error) {
    console.error('Error saving signature:', error);
    throw error;
  }
};

// Update an existing signature
export const updateSignature = async (
  signatureId: string, 
  params: UpdateSignatureParams
): Promise<Signature> => {
  try {
    console.log('Updating signature:', signatureId);
    
    const { data, error } = await supabase
      .from('signatures')
      .update(params)
      .eq('id', signatureId)
      .select()
      .single();
    
    if (error) {
      console.error('Error updating signature:', error);
      throw error;
    }
    
    console.log('Signature updated successfully:', data.id);
    return data as Signature;
  } catch (error) {
    console.error('Error updating signature:', error);
    throw error;
  }
};

// Delete a signature
export const deleteSignature = async (signatureId: string): Promise<void> => {
  try {
    console.log('Deleting signature:', signatureId);
    
    const { error } = await supabase
      .from('signatures')
      .delete()
      .eq('id', signatureId);
    
    if (error) {
      console.error('Error deleting signature:', error);
      throw error;
    }
    
    console.log('Signature deleted successfully');
  } catch (error) {
    console.error('Error deleting signature:', error);
    throw error;
  }
};

// Get a specific signature by ID
export const getSignatureById = async (signatureId: string): Promise<Signature | null> => {
  try {
    console.log('Fetching signature:', signatureId);
    
    const { data, error } = await supabase
      .from('signatures')
      .select('*')
      .eq('id', signatureId)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned
        return null;
      }
      console.error('Error fetching signature:', error);
      throw error;
    }
    
    return data as Signature;
  } catch (error) {
    console.error('Error getting signature:', error);
    throw error;
  }
};