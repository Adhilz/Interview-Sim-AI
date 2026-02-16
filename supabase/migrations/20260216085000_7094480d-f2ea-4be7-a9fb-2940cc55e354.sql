-- Allow admins to update branch for students in their university
CREATE POLICY "Admins can update branch for their students"
ON public.profiles
FOR UPDATE
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_in_admin_university(user_id, auth.uid())
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_in_admin_university(user_id, auth.uid())
);