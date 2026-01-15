-- Create admin_notifications table
CREATE TABLE public.admin_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL,
  university_id UUID REFERENCES public.university_codes(id),
  student_id UUID NOT NULL,
  student_name TEXT,
  interview_id UUID REFERENCES public.interviews(id) ON DELETE CASCADE,
  interview_type TEXT DEFAULT 'technical',
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Admins can only see notifications for their university
CREATE POLICY "Admins can view their university notifications"
ON public.admin_notifications
FOR SELECT
USING (
  admin_user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.university_codes uc
    WHERE uc.id = university_id 
    AND uc.admin_user_id = auth.uid()
  )
);

-- Allow marking notifications as read
CREATE POLICY "Admins can update their notifications"
ON public.admin_notifications
FOR UPDATE
USING (admin_user_id = auth.uid());

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_notifications;

-- Create function to notify admin when interview completes
CREATE OR REPLACE FUNCTION public.notify_admin_on_interview_complete()
RETURNS TRIGGER AS $$
DECLARE
  v_student_profile RECORD;
  v_admin_user_id UUID;
  v_university_id UUID;
  v_interview_duration TEXT;
BEGIN
  -- Only trigger when status changes to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Get student profile and university info
    SELECT p.full_name, p.university_code_id, p.user_id
    INTO v_student_profile
    FROM public.profiles p
    WHERE p.user_id = NEW.user_id;
    
    IF v_student_profile.university_code_id IS NOT NULL THEN
      -- Get admin for this university
      SELECT uc.admin_user_id, uc.id
      INTO v_admin_user_id, v_university_id
      FROM public.university_codes uc
      WHERE uc.id = v_student_profile.university_code_id;
      
      -- Get interview duration
      v_interview_duration := NEW.duration || '-minute';
      
      IF v_admin_user_id IS NOT NULL THEN
        -- Insert notification
        INSERT INTO public.admin_notifications (
          admin_user_id,
          university_id,
          student_id,
          student_name,
          interview_id,
          interview_type,
          message
        ) VALUES (
          v_admin_user_id,
          v_university_id,
          v_student_profile.user_id,
          COALESCE(v_student_profile.full_name, 'A student'),
          NEW.id,
          v_interview_duration,
          'Student ' || COALESCE(v_student_profile.full_name, 'Unknown') || ' has completed the ' || v_interview_duration || ' interview.'
        );
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on interviews table
DROP TRIGGER IF EXISTS on_interview_complete_notify_admin ON public.interviews;
CREATE TRIGGER on_interview_complete_notify_admin
  AFTER UPDATE ON public.interviews
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_admin_on_interview_complete();