-- Update the handle_new_user function to support admin role selection during signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  code_id UUID;
  user_role app_role;
BEGIN
  -- Get university code from metadata (may be null for admins)
  code_id := (NEW.raw_user_meta_data ->> 'university_code_id')::UUID;
  
  -- Get role from metadata, default to student
  user_role := COALESCE((NEW.raw_user_meta_data ->> 'role')::app_role, 'student'::app_role);
  
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, university_code_id)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    code_id
  );
  
  -- Assign role from metadata
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Increment university code usage only if code was provided
  IF code_id IS NOT NULL THEN
    UPDATE public.university_codes
    SET current_uses = current_uses + 1
    WHERE id = code_id;
  END IF;
  
  RETURN NEW;
END;
$function$;