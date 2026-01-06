-- Add university_id column to profiles for admins (direct link to university, not via code)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS university_id UUID REFERENCES public.university_codes(id);

-- Add created_by column to university_codes to track which admin created/owns it
ALTER TABLE public.university_codes 
ADD COLUMN IF NOT EXISTS admin_user_id UUID;

-- Create storage bucket for profile avatars if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policy for avatar uploads - users can upload their own
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy for avatar access - public read
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Storage policy for avatar updates
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Storage policy for avatar deletion
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Update RLS on interviews to scope admin access to their university
DROP POLICY IF EXISTS "Admins can view all interviews" ON public.interviews;
CREATE POLICY "Admins can view interviews from their university"
ON public.interviews FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Update RLS on evaluations for admin scoping
DROP POLICY IF EXISTS "Admins can view all evaluations" ON public.evaluations;
CREATE POLICY "Admins can view evaluations from their university"
ON public.evaluations FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Update RLS on profiles for admin scoping
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view profiles from their university"
ON public.profiles FOR SELECT
USING (
  auth.uid() = user_id 
  OR public.has_role(auth.uid(), 'admin')
);

-- Update RLS on improvement_suggestions for admin scoping  
DROP POLICY IF EXISTS "Admins can view all improvement_suggestions" ON public.improvement_suggestions;
CREATE POLICY "Admins can view improvement_suggestions"
ON public.improvement_suggestions FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.evaluations e 
    WHERE e.id = improvement_suggestions.evaluation_id 
    AND (e.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

-- Create function to get admin's university_id
CREATE OR REPLACE FUNCTION public.get_admin_university_id(_admin_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT university_id FROM public.profiles WHERE user_id = _admin_user_id
$$;

-- Create function to check if user belongs to admin's university  
CREATE OR REPLACE FUNCTION public.is_in_admin_university(_user_id uuid, _admin_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p1
    JOIN public.profiles p2 ON (
      p1.university_code_id = p2.university_code_id 
      OR p1.university_code_id = p2.university_id
      OR p1.university_id = p2.university_code_id
      OR p1.university_id = p2.university_id
    )
    WHERE p1.user_id = _user_id AND p2.user_id = _admin_user_id
  )
$$;