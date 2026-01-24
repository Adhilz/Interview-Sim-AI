-- Create ATS scores table to store resume ATS analysis
CREATE TABLE public.ats_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  job_role TEXT,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  keyword_match_percentage INTEGER CHECK (keyword_match_percentage >= 0 AND keyword_match_percentage <= 100),
  section_scores JSONB DEFAULT '{}',
  missing_keywords TEXT[],
  strengths TEXT[],
  weaknesses TEXT[],
  improvement_suggestions JSONB DEFAULT '[]',
  recruiter_review TEXT,
  formatting_issues TEXT[],
  optimized_bullets JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(resume_id, job_role)
);

-- Enable RLS
ALTER TABLE public.ats_scores ENABLE ROW LEVEL SECURITY;

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to ats_scores"
ON public.ats_scores
FOR SELECT
TO anon
USING (false);

-- Users can view their own ATS scores
CREATE POLICY "Users can view their own ATS scores"
ON public.ats_scores
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert their own ATS scores
CREATE POLICY "Users can insert their own ATS scores"
ON public.ats_scores
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can update their own ATS scores
CREATE POLICY "Users can update their own ATS scores"
ON public.ats_scores
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

-- Users can delete their own ATS scores
CREATE POLICY "Users can delete their own ATS scores"
ON public.ats_scores
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- Admins can view ATS scores from their university
CREATE POLICY "Admins can view ATS scores from their university"
ON public.ats_scores
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  AND is_in_admin_university(user_id, auth.uid())
);

-- Create updated_at trigger
CREATE TRIGGER update_ats_scores_updated_at
BEFORE UPDATE ON public.ats_scores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();