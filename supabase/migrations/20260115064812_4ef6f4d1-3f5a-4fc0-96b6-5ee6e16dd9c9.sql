-- Deny anonymous users from reading interview sessions
CREATE POLICY "Deny public access to interview sessions"
ON public.interview_sessions
AS RESTRICTIVE
FOR SELECT
TO anon
USING (false);