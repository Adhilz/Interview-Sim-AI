-- Fix: Force all new signups to student role, ignore client-provided role
-- This prevents privilege escalation by users self-assigning admin role

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  code_id UUID;
BEGIN
  -- Get university code from metadata (may be null for admins)
  code_id := (NEW.raw_user_meta_data ->> 'university_code_id')::UUID;
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, university_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    code_id
  );
  
  -- SECURITY FIX: Always assign student role - ignore any client-provided role
  -- Admin role must be assigned separately through a secure admin invitation process
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student'::app_role);
  
  -- Increment university code usage only if code was provided
  IF code_id IS NOT NULL THEN
    UPDATE public.university_codes
    SET current_uses = current_uses + 1
    WHERE id = code_id;
  END IF;
  
  RETURN NEW;
END;
$$;