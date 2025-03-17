import { supabase } from '../../lib/supabase';

/**
 * Get the student profile data
 * @param {string} userId - The user ID
 * @returns {Promise<Object>} - The student profile data
 */
export const getStudentProfile = async (userId) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching student profile:', error);
    return { data: null, error };
  }
};

/**
 * Update the student profile
 * @param {string} userId - The user ID
 * @param {Object} profileData - The profile data to update
 * @returns {Promise<Object>} - The updated profile data
 */
export const updateStudentProfile = async (userId, profileData) => {
  try {
    if (!userId) {
      throw new Error('User ID is required');
    }
    
    const { data, error } = await supabase
      .from('profiles')
      .update(profileData)
      .eq('id', userId)
      .select()
      .single();
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error updating student profile:', error);
    return { data: null, error };
  }
}; 