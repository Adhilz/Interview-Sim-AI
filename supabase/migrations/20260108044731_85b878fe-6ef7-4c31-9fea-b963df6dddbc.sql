-- Drop the overly permissive public SELECT policy that exposes university codes to unauthenticated users
-- Code validation will continue to work through the secure validate_university_code RPC function (SECURITY DEFINER)
-- Admins can still manage codes via the existing "Admins can manage university codes" policy

DROP POLICY IF EXISTS "Anyone can read active university codes" ON public.university_codes;