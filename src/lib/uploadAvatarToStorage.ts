import { supabase } from '@/integrations/supabase/client';

/**
 * Uploads an avatar image to Supabase storage and returns the public URL.
 * The URL is publicly accessible for D-ID to use.
 */
export const uploadAvatarToStorage = async (
  file: File,
  fileName?: string
): Promise<string> => {
  const name = fileName || `avatar-${Date.now()}.${file.name.split('.').pop()}`;
  
  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(name, file, {
      cacheControl: '0',
      upsert: true
    });

  if (error) {
    console.error('Error uploading avatar:', error);
    throw new Error(`Failed to upload avatar: ${error.message}`);
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(data.path);

  console.log('Avatar uploaded successfully:', urlData.publicUrl);
  return urlData.publicUrl;
};

/**
 * Initializes the default interviewer avatar in storage.
 * This should be called once during app setup.
 */
export const initializeDefaultAvatar = async (): Promise<string> => {
  const bucketUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/interviewer.png`;

  // Always (re)upload from the app's bundled avatar so the storage file stays in sync.
  // This keeps the avatar available as a public URL for D-ID.
  try {
    const response = await fetch('/avatars/interviewer.png', { cache: 'no-store' });
    if (!response.ok) {
      console.warn('[Avatar] Failed to fetch bundled avatar, using existing storage URL');
      return bucketUrl;
    }

    const blob = await response.blob();
    const file = new File([blob], 'interviewer.png', { type: blob.type || 'image/png' });

    return await uploadAvatarToStorage(file, 'interviewer.png');
  } catch (error) {
    console.error('Error initializing default avatar:', error);
    return bucketUrl;
  }
};

/**
 * Gets the default interviewer avatar URL from storage.
 */
export const getDefaultAvatarUrl = (): string => {
  return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/avatars/interviewer.png`;
};
