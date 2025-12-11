import { createClient } from '@supabase/supabase-js'

// Supabase configuration from environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://josfixdtdfpmwmymorxs.supabase.co'
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_sDdP03HdWlxq3zGilu8yBg_RtfDQrFX'

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Bucket names
export const BUCKETS = {
  AVATARS: 'avatars',      // For profile images
  RESUMES: 'resumes',      // For CV/Resume files
}

/**
 * Upload a file to Supabase Storage
 * @param bucket - The bucket name (avatars, resumes)
 * @param filePath - The path/name for the file in the bucket
 * @param file - The file to upload
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (
  bucket: string,
  filePath: string,
  file: File
): Promise<string | null> => {
  try {
    // Upload the file
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true, // Overwrite if exists
      })

    if (error) {
      console.error('❌ Supabase upload error:', error)
      throw error
    }

    console.log('✅ File uploaded:', data.path)

    // Get the public URL
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath)

    return urlData.publicUrl
  } catch (error: any) {
    console.error('❌ Upload error:', error.message)
    throw new Error(error.message || 'Failed to upload file')
  }
}

/**
 * Upload profile avatar
 * @param userId - The user's ID
 * @param file - The image file
 * @returns The public URL of the uploaded avatar
 */
export const uploadAvatar = async (
  userId: string,
  file: File
): Promise<string> => {
  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a JPEG, PNG, GIF, or WebP image.')
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 5MB.')
  }

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const fileName = `${userId}/avatar.${fileExt}`

  const url = await uploadFile(BUCKETS.AVATARS, fileName, file)
  if (!url) {
    throw new Error('Failed to get file URL')
  }

  return url
}

/**
 * Upload resume/CV
 * @param userId - The user's ID
 * @param file - The resume file
 * @returns The public URL of the uploaded resume
 */
export const uploadResume = async (
  userId: string,
  file: File
): Promise<string> => {
  // Validate file type
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Invalid file type. Please upload a PDF or Word document.')
  }

  // Validate file size (max 10MB)
  const maxSize = 10 * 1024 * 1024 // 10MB
  if (file.size > maxSize) {
    throw new Error('File too large. Maximum size is 10MB.')
  }

  // Generate unique filename with timestamp
  const timestamp = Date.now()
  const fileExt = file.name.split('.').pop()
  const originalName = file.name.replace(`.${fileExt}`, '').replace(/[^a-zA-Z0-9]/g, '_')
  const fileName = `${userId}/${originalName}_${timestamp}.${fileExt}`

  const url = await uploadFile(BUCKETS.RESUMES, fileName, file)
  if (!url) {
    throw new Error('Failed to get file URL')
  }

  return url
}

/**
 * Delete a file from Supabase Storage
 * @param bucket - The bucket name
 * @param filePath - The path of the file to delete
 */
export const deleteFile = async (
  bucket: string,
  filePath: string
): Promise<void> => {
  try {
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath])

    if (error) {
      console.error('❌ Delete error:', error)
      throw error
    }

    console.log('✅ File deleted:', filePath)
  } catch (error: any) {
    console.error('❌ Delete error:', error.message)
    throw new Error(error.message || 'Failed to delete file')
  }
}

/**
 * Get file path from URL
 * @param url - The public URL of the file
 * @param bucket - The bucket name
 * @returns The file path within the bucket
 */
export const getFilePathFromUrl = (url: string, bucket: string): string | null => {
  try {
    const urlObj = new URL(url)
    const pathParts = urlObj.pathname.split(`/${bucket}/`)
    return pathParts[1] || null
  } catch {
    return null
  }
}

