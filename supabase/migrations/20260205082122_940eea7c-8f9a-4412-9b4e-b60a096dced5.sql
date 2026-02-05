-- Create aptitude_tests table to store test results
CREATE TABLE public.aptitude_tests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  score INTEGER NOT NULL,
  total_questions INTEGER NOT NULL DEFAULT 10,
  questions JSONB NOT NULL,
  answers JSONB NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.aptitude_tests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own aptitude tests"
ON public.aptitude_tests
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own aptitude tests"
ON public.aptitude_tests
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view aptitude tests from their university"
ON public.aptitude_tests
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_in_admin_university(user_id, auth.uid())
);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to aptitude_tests"
ON public.aptitude_tests
FOR SELECT
USING (false);

-- Create index for faster queries
CREATE INDEX idx_aptitude_tests_user_id ON public.aptitude_tests(user_id);
CREATE INDEX idx_aptitude_tests_completed_at ON public.aptitude_tests(completed_at DESC);