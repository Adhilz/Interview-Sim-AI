-- Add restrictive policies to deny anonymous access to profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);

-- Add restrictive policies to deny anonymous access to resumes table
CREATE POLICY "Deny anonymous access to resumes"
ON public.resumes
FOR SELECT
TO anon
USING (false);