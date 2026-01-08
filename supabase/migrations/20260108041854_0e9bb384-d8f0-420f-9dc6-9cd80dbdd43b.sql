-- Add explicit deny policies for avatar_sessions write operations
-- Avatar sessions are managed server-side via edge functions, not by clients directly

-- Deny direct client inserts - avatar sessions are managed server-side
CREATE POLICY "Deny direct avatar session inserts"
  ON public.avatar_sessions FOR INSERT
  TO authenticated
  WITH CHECK (false);

-- Deny direct client updates - avatar sessions are managed server-side
CREATE POLICY "Deny direct avatar session updates"
  ON public.avatar_sessions FOR UPDATE
  TO authenticated
  USING (false);

-- Deny direct client deletes - avatar sessions are managed server-side
CREATE POLICY "Deny direct avatar session deletes"
  ON public.avatar_sessions FOR DELETE
  TO authenticated
  USING (false);