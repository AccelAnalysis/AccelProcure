import { supabase } from '../config/auth.config';

// Default storage bucket name
const STORAGE_BUCKET = 'rfx-documents';

/**
 * Upload a file to Supabase Storage
 * @param {File} file - The file to upload
 * @param {string} path - The path within the storage bucket (e.g., 'rfx/1234/proposals')
 * @param {Object} metadata - Optional file metadata
 * @returns {Promise<{data: {path: string, fullPath: string, id: string}, error: Error}>}
 */
export const uploadFile = async (file, path, metadata = {}) => {
  try {
    // Ensure the bucket exists
    await ensureBucketExists(STORAGE_BUCKET);
    
    // Generate a unique filename to prevent collisions
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
    const filePath = `${path}/${fileName}`.replace(/\/+/g, '/');

    // Upload the file
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
        ...metadata
      });

    if (error) throw error;

    // Get the public URL
    const { data: { publicUrl } } = supabase.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(data.path);

    return {
      data: {
        ...data,
        publicUrl,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size
      },
      error: null
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return { data: null, error };
  }
};

/**
 * Delete a file from Supabase Storage
 * @param {string} filePath - The full path to the file in the storage bucket
 * @returns {Promise<{data: any, error: Error}>}
 */
export const deleteFile = async (filePath) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .remove([filePath]);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error deleting file:', error);
    return { data: null, error };
  }
};

/**
 * Get a list of files in a specific path
 * @param {string} path - The path to list files from
 * @returns {Promise<{data: Array, error: Error}>}
 */
export const listFiles = async (path = '') => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(path);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error listing files:', error);
    return { data: null, error };
  }
};

/**
 * Get a signed URL for a file
 * @param {string} filePath - The path to the file in the storage bucket
 * @param {number} expiresIn - Expiration time in seconds (default: 1 hour)
 * @returns {Promise<{data: string, error: Error}>}
 */
export const getSignedUrl = async (filePath, expiresIn = 3600) => {
  try {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn);

    if (error) throw error;
    return { data: data.signedUrl, error: null };
  } catch (error) {
    console.error('Error getting signed URL:', error);
    return { data: null, error };
  }
};

/**
 * Ensure a bucket exists, create it if it doesn't
 * @private
 */
const ensureBucketExists = async (bucketName) => {
  const { data: buckets } = await supabase.storage.listBuckets();
  const bucketExists = buckets.some(bucket => bucket.name === bucketName);
  
  if (!bucketExists) {
    // In a real app, you might want to handle this differently
    // as creating buckets might require admin privileges
    console.warn(`Bucket ${bucketName} does not exist. Please create it in the Supabase dashboard.`);
  }
};

export default {
  uploadFile,
  deleteFile,
  listFiles,
  getSignedUrl,
  BUCKET_NAME: STORAGE_BUCKET
};
