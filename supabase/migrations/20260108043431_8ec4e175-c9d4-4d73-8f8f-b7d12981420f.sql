-- Fix overly permissive storage policies
-- Drop the overly permissive policies from migration 20251222081416
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete avatars" ON storage.objects;

-- The user-scoped policies from migration 20260106082856 remain:
-- "Users can upload their own avatar" - restricts to user's own folder
-- "Users can update their own avatar" - restricts to user's own folder
-- "Users can delete their own avatar" - restricts to user's own folder

-- Add policy for admins to manage shared avatars (like interviewer.png in root)
CREATE POLICY "Admins can manage shared avatars"
  ON storage.objects FOR ALL
  USING (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND public.has_role(auth.uid(), 'admin'::app_role)
  );