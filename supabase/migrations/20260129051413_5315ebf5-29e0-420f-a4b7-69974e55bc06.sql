-- Add transcript and response analysis to evaluations
ALTER TABLE public.evaluations 
ADD COLUMN IF NOT EXISTS transcript TEXT,
ADD COLUMN IF NOT EXISTS response_analysis JSONB;

-- Add comment for documentation
COMMENT ON COLUMN public.evaluations.transcript IS 'Full interview transcript';
COMMENT ON COLUMN public.evaluations.response_analysis IS 'Per-response quality analysis with good points and improvements';