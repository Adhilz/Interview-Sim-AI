-- Allow students to read the university_codes row they are linked to
CREATE POLICY "Students can view their linked university code"
ON public.university_codes
FOR SELECT
USING (
  id IN (
    SELECT university_code_id FROM public.profiles WHERE user_id = auth.uid()
    UNION
    SELECT university_id FROM public.profiles WHERE user_id = auth.uid()
  )
);