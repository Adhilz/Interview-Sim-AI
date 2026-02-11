-- Create branch enum
CREATE TYPE public.student_branch AS ENUM ('CSE', 'ECE', 'ME', 'EEE', 'FSE', 'AI', 'RA', 'CIVIL');

-- Add branch column to profiles
ALTER TABLE public.profiles
ADD COLUMN branch public.student_branch NULL;