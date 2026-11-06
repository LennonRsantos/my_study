-- Add optional course_id to study_sessions
ALTER TABLE public.study_sessions
ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL DEFAULT NULL;

-- Index for performance
CREATE INDEX idx_study_sessions_course_id ON public.study_sessions(course_id);
