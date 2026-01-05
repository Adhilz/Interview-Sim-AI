
-- Add RLS policies for admins to view all interviews
CREATE POLICY "Admins can view all interviews"
ON public.interviews
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policies for admins to view all evaluations
CREATE POLICY "Admins can view all evaluations"
ON public.evaluations
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policies for admins to view all profiles
CREATE POLICY "Admins can view all profiles"
ON public.profiles
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Add RLS policies for admins to view all improvement suggestions
CREATE POLICY "Admins can view all improvement suggestions"
ON public.improvement_suggestions
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));
