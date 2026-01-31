-- Add interview_mode column to interviews table
-- This is an OPTIONAL column to preserve backward compatibility
-- Values: 'resume_jd' (default), 'technical', 'hr'

ALTER TABLE public.interviews 
ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20) DEFAULT 'resume_jd';

-- Add a check constraint for valid values
ALTER TABLE public.interviews
ADD CONSTRAINT interviews_mode_check 
CHECK (interview_mode IN ('resume_jd', 'technical', 'hr'));

-- Add index for performance when filtering by mode
CREATE INDEX IF NOT EXISTS idx_interviews_mode ON public.interviews(interview_mode);

-- Update the evaluations table to also store interview_mode for easier querying
ALTER TABLE public.evaluations
ADD COLUMN IF NOT EXISTS interview_mode VARCHAR(20);

-- Add constraint on evaluations mode
ALTER TABLE public.evaluations
ADD CONSTRAINT evaluations_mode_check 
CHECK (interview_mode IS NULL OR interview_mode IN ('resume_jd', 'technical', 'hr'));