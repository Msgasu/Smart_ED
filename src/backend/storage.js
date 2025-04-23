import { supabase } from '../lib/supabase';
import { v4 as uuidv4 } from 'uuid';

/**
 * Upload a file to Supabase storage
 * @param {File} file - The file to upload
 * @param {string} bucket - The storage bucket name
 * @param {string} folder - The folder path in the bucket
 * @returns {Promise<Object>} - The upload result
 */
export const uploadFile = async (file, bucket, folder = '') => {
  try {
    if (!file || !bucket) {
      throw new Error('File and bucket name are required');
    }
    
    // Generate a unique file path
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;
    
    // Upload file to Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);
      
    // Return file information
    return {
      data: {
        path: filePath,
        url: urlData.publicUrl,
        filename: file.name,
        file_type: file.type,
        file_size: file.size
      },
      error: null
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error };
  }
};

/**
 * Download a file
 * @param {string} path - The file path
 * @param {string} bucket - The storage bucket name
 * @returns {Promise<Object>} - The download result
 */
export const downloadFile = async (path, bucket) => {
  try {
    if (!path || !bucket) {
      throw new Error('File path and bucket name are required');
    }
    
    // Create a signed URL (valid for 60 minutes)
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, 3600);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error downloading file:', error);
    return { data: null, error };
  }
};

/**
 * Delete a file
 * @param {string} path - The file path
 * @param {string} bucket - The storage bucket name
 * @returns {Promise<Object>} - The delete result
 */
export const deleteFile = async (path, bucket) => {
  try {
    if (!path || !bucket) {
      throw new Error('File path and bucket name are required');
    }
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove([path]);
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { data: null, error };
  }
}; 