-- Lessons inside a course module: imported from the platform JSON and checked off one by one
CREATE TABLE public.course_lessons (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  module_id uuid NOT NULL REFERENCES public.course_modules(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL DEFAULT 0,
  duration_seconds integer CHECK (duration_seconds IS NULL OR duration_seconds >= 0),
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_lessons TO authenticated;
GRANT ALL ON public.course_lessons TO service_role;

ALTER TABLE public.course_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own course lessons" ON public.course_lessons FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own course lessons" ON public.course_lessons FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own course lessons" ON public.course_lessons FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own course lessons" ON public.course_lessons FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_course_lessons_module ON public.course_lessons(module_id);

NOTIFY pgrst, 'reload schema';
