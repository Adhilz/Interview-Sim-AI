
-- Add missing DELETE policy for resume_highlights table
-- This completes the RLS policy coverage for this table

CREATE POLICY "Users can delete their own resume highlights"
ON public.resume_highlights 
FOR DELETE
TO authenticated
USING (user_id = auth.uid());
