-- Remove duplicate public read policy for avatars bucket
-- "Avatar images are publicly accessible" and "Public read access for avatars" are duplicates
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;