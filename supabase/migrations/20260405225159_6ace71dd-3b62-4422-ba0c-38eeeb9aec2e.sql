
-- Pomodoro settings per user
CREATE TABLE public.pomodoro_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  focus_minutes integer NOT NULL DEFAULT 25,
  short_break_minutes integer NOT NULL DEFAULT 5,
  long_break_minutes integer NOT NULL DEFAULT 15,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.pomodoro_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own pomodoro_settings" ON public.pomodoro_settings FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pomodoro_settings" ON public.pomodoro_settings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pomodoro_settings" ON public.pomodoro_settings FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pomodoro_settings" ON public.pomodoro_settings FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Courses table
CREATE TABLE public.courses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  color text NOT NULL DEFAULT '#2563eb',
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own courses" ON public.courses FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert own courses" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own courses" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can delete own courses" ON public.courses FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- Course-Subject link table
CREATE TABLE public.course_subjects (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id uuid NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(course_id, subject_id)
);

ALTER TABLE public.course_subjects ENABLE ROW LEVEL SECURITY;

-- Access via course ownership
CREATE POLICY "Users can select own course_subjects" ON public.course_subjects FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
CREATE POLICY "Users can insert own course_subjects" ON public.course_subjects FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own course_subjects" ON public.course_subjects FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.courses c WHERE c.id = course_id AND (c.user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))));
