-- Create enum for roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for interview duration
CREATE TYPE public.interview_duration AS ENUM ('3', '5');

-- Create enum for interview status
CREATE TYPE public.interview_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- University codes table
CREATE TABLE public.university_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(50) UNIQUE NOT NULL,
  university_name VARCHAR(255) NOT NULL,
  max_uses INTEGER DEFAULT NULL,
  current_uses INTEGER DEFAULT 0,
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  university_code_id UUID REFERENCES public.university_codes(id),
  camera_permission BOOLEAN DEFAULT FALSE,
  microphone_permission BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'student',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, role)
);

-- Resumes table
CREATE TABLE public.resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  parsed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resume highlights table (parsed data)
CREATE TABLE public.resume_highlights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id UUID REFERENCES public.resumes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  skills TEXT[],
  tools TEXT[],
  experience JSONB,
  projects JSONB,
  education JSONB,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interviews table
CREATE TABLE public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  resume_id UUID REFERENCES public.resumes(id),
  duration interview_duration NOT NULL DEFAULT '3',
  status interview_status NOT NULL DEFAULT 'scheduled',
  scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Interview sessions table
CREATE TABLE public.interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL,
  vapi_session_id VARCHAR(255),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- VAPI logs table
CREATE TABLE public.vapi_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE NOT NULL,
  log_type VARCHAR(50),
  message TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Evaluations table
CREATE TABLE public.evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE NOT NULL UNIQUE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  technical_score INTEGER CHECK (technical_score >= 0 AND technical_score <= 100),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  feedback TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Improvement suggestions table
CREATE TABLE public.improvement_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id UUID REFERENCES public.evaluations(id) ON DELETE CASCADE NOT NULL,
  category VARCHAR(100),
  suggestion TEXT NOT NULL,
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Avatar sessions placeholder table
CREATE TABLE public.avatar_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_session_id UUID REFERENCES public.interview_sessions(id) ON DELETE CASCADE,
  avatar_provider VARCHAR(50) DEFAULT 'd-id',
  session_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.university_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resume_highlights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vapi_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avatar_sessions ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to validate university code
CREATE OR REPLACE FUNCTION public.validate_university_code(code_input VARCHAR)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_record RECORD;
BEGIN
  SELECT * INTO code_record
  FROM public.university_codes
  WHERE code = code_input
    AND is_active = TRUE
    AND (expires_at IS NULL OR expires_at > NOW())
    AND (max_uses IS NULL OR current_uses < max_uses);
  
  IF code_record IS NULL THEN
    RETURN NULL;
  END IF;
  
  RETURN code_record.id;
END;
$$;

-- RLS Policies

-- University codes: Anyone can validate (read), only admins can modify
CREATE POLICY "Anyone can read active university codes"
  ON public.university_codes FOR SELECT
  USING (is_active = TRUE);

CREATE POLICY "Admins can manage university codes"
  ON public.university_codes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Profiles: Users can read/update their own profile
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- User roles: Users can view their own roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Resumes: Users can manage their own resumes
CREATE POLICY "Users can view their own resumes"
  ON public.resumes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own resumes"
  ON public.resumes FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own resumes"
  ON public.resumes FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own resumes"
  ON public.resumes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Resume highlights: Users can manage their own
CREATE POLICY "Users can view their own resume highlights"
  ON public.resume_highlights FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own resume highlights"
  ON public.resume_highlights FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own resume highlights"
  ON public.resume_highlights FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Interviews: Users can manage their own interviews
CREATE POLICY "Users can view their own interviews"
  ON public.interviews FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own interviews"
  ON public.interviews FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own interviews"
  ON public.interviews FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

-- Interview sessions: Users can view sessions for their interviews
CREATE POLICY "Users can view their interview sessions"
  ON public.interview_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_sessions.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create interview sessions"
  ON public.interview_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = interview_sessions.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

-- VAPI logs: Users can view logs for their sessions
CREATE POLICY "Users can view their vapi logs"
  ON public.vapi_logs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      JOIN public.interviews ON interviews.id = interview_sessions.interview_id
      WHERE interview_sessions.id = vapi_logs.interview_session_id
      AND interviews.user_id = auth.uid()
    )
  );

-- Evaluations: Users can view their own evaluations
CREATE POLICY "Users can view their own evaluations"
  ON public.evaluations FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Improvement suggestions: Users can view suggestions for their evaluations
CREATE POLICY "Users can view their improvement suggestions"
  ON public.improvement_suggestions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.evaluations
      WHERE evaluations.id = improvement_suggestions.evaluation_id
      AND evaluations.user_id = auth.uid()
    )
  );

-- Avatar sessions: Users can view their avatar sessions
CREATE POLICY "Users can view their avatar sessions"
  ON public.avatar_sessions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.interview_sessions
      JOIN public.interviews ON interviews.id = interview_sessions.interview_id
      WHERE interview_sessions.id = avatar_sessions.interview_session_id
      AND interviews.user_id = auth.uid()
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  code_id UUID;
BEGIN
  -- Get university code from metadata
  code_id := (NEW.raw_user_meta_data ->> 'university_code_id')::UUID;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, university_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    code_id
  );
  
  -- Assign student role by default
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  -- Increment university code usage
  IF code_id IS NOT NULL THEN
    UPDATE public.university_codes
    SET current_uses = current_uses + 1
    WHERE id = code_id;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_resumes_updated_at
  BEFORE UPDATE ON public.resumes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_interviews_updated_at
  BEFORE UPDATE ON public.interviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_university_codes_updated_at
  BEFORE UPDATE ON public.university_codes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert a sample university code for testing
INSERT INTO public.university_codes (code, university_name, is_active)
VALUES ('DEMO2024', 'Demo University', TRUE);