
-- Fix security issue: Admins can currently access ALL university codes, not just their own.
-- This enables cross-university access which violates data isolation requirements.

-- Drop the existing overly permissive policy
DROP POLICY IF EXISTS "Admins can manage university codes" ON public.university_codes;

-- Create a properly scoped policy where admins can only manage codes they created
CREATE POLICY "Admins can manage their own university codes" 
ON public.university_codes 
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND admin_user_id = auth.uid()
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role)
  AND admin_user_id = auth.uid()
);
