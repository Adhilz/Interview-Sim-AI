-- Security fixes (retry): lock down role writes and scope admin reads by university

-- 1) Harden user_roles: explicit RESTRICTIVE deny policies for all writes
DROP POLICY IF EXISTS "Deny role inserts" ON public.user_roles;
CREATE POLICY "Deny role inserts"
ON public.user_roles
AS RESTRICTIVE
FOR INSERT
TO authenticated
WITH CHECK (false);

DROP POLICY IF EXISTS "Deny role updates" ON public.user_roles;
CREATE POLICY "Deny role updates"
ON public.user_roles
AS RESTRICTIVE
FOR UPDATE
TO authenticated
USING (false);

DROP POLICY IF EXISTS "Deny role deletes" ON public.user_roles;
CREATE POLICY "Deny role deletes"
ON public.user_roles
AS RESTRICTIVE
FOR DELETE
TO authenticated
USING (false);

-- 2) Scope admin SELECT access to their own university
ALTER POLICY "Admins can view profiles from their university"
ON public.profiles
USING (
  (auth.uid() = user_id)
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_in_admin_university(user_id, auth.uid())
  )
);

ALTER POLICY "Admins can view interviews from their university"
ON public.interviews
USING (
  (auth.uid() = user_id)
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_in_admin_university(user_id, auth.uid())
  )
);

ALTER POLICY "Admins can view evaluations from their university"
ON public.evaluations
USING (
  (auth.uid() = user_id)
  OR (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND public.is_in_admin_university(user_id, auth.uid())
  )
);

-- improvement_suggestions: admins only see suggestions for evaluations in their university
ALTER POLICY "Admins can view all improvement suggestions"
ON public.improvement_suggestions
USING (
  public.has_role(auth.uid(), 'admin'::public.app_role)
  AND EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = improvement_suggestions.evaluation_id
      AND public.is_in_admin_university(e.user_id, auth.uid())
  )
);

ALTER POLICY "Admins can view improvement_suggestions"
ON public.improvement_suggestions
USING (
  EXISTS (
    SELECT 1
    FROM public.evaluations e
    WHERE e.id = improvement_suggestions.evaluation_id
      AND (
        e.user_id = auth.uid()
        OR (
          public.has_role(auth.uid(), 'admin'::public.app_role)
          AND public.is_in_admin_university(e.user_id, auth.uid())
        )
      )
  )
);