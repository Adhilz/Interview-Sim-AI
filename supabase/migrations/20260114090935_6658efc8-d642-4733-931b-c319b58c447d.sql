
-- Fix security issue: "Admins can view profiles from their university" policy 
-- currently applies to 'public' role which includes anonymous users.
-- While the condition should fail for anonymous users, it's best practice
-- to restrict this to authenticated users only.

-- Drop the existing policy
DROP POLICY IF EXISTS "Admins can view profiles from their university" ON public.profiles;

-- Recreate the policy restricted to authenticated users only
CREATE POLICY "Admins can view profiles from their university" 
ON public.profiles 
FOR SELECT
TO authenticated
USING (
  (auth.uid() = user_id) 
  OR (has_role(auth.uid(), 'admin'::app_role) AND is_in_admin_university(user_id, auth.uid()))
);
