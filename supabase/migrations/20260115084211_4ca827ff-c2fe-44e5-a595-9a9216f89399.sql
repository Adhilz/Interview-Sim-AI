-- Deny direct inserts to vapi_logs (logs should only be created by edge functions with service role)
CREATE POLICY "Deny direct vapi log inserts"
ON public.vapi_logs
AS RESTRICTIVE
FOR INSERT
WITH CHECK (false);

-- Deny updates to prevent tampering with interview logs
CREATE POLICY "Deny vapi log updates"
ON public.vapi_logs
AS RESTRICTIVE
FOR UPDATE
USING (false);

-- Deny deletes to preserve audit trail
CREATE POLICY "Deny vapi log deletes"
ON public.vapi_logs
AS RESTRICTIVE
FOR DELETE
USING (false);