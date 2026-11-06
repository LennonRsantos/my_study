-- Languages module (isolated from subjects/courses/sessions)

CREATE TYPE public.language_level AS ENUM ('beginner', 'intermediate', 'advanced');

-- Languages
CREATE TABLE public.languages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  icon text,
  color text NOT NULL DEFAULT '#6366f1',
  level public.language_level NOT NULL DEFAULT 'beginner',
  target_hours numeric NOT NULL DEFAULT 0,
  start_date date,
  resources jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.languages TO authenticated;
GRANT ALL ON public.languages TO service_role;
ALTER TABLE public.languages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own languages" ON public.languages FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_languages_updated BEFORE UPDATE ON public.languages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Language subjects (matérias)
CREATE TABLE public.language_subjects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  icon text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_subjects TO authenticated;
GRANT ALL ON public.language_subjects TO service_role;
ALTER TABLE public.language_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lang subjects" ON public.language_subjects FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_lang_subjects_updated BEFORE UPDATE ON public.language_subjects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Language courses
CREATE TABLE public.language_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  total_hours numeric NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1',
  icon text,
  completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_courses TO authenticated;
GRANT ALL ON public.language_courses TO service_role;
ALTER TABLE public.language_courses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lang courses" ON public.language_courses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_lang_courses_updated BEFORE UPDATE ON public.language_courses FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Language sessions
CREATE TABLE public.language_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id uuid NOT NULL REFERENCES public.languages(id) ON DELETE CASCADE,
  subject_id uuid REFERENCES public.language_subjects(id) ON DELETE SET NULL,
  course_id uuid REFERENCES public.language_courses(id) ON DELETE SET NULL,
  date date NOT NULL,
  start_time text NOT NULL,
  end_time text NOT NULL,
  hours numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.language_sessions TO authenticated;
GRANT ALL ON public.language_sessions TO service_role;
ALTER TABLE public.language_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own lang sessions" ON public.language_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_lang_sessions_updated BEFORE UPDATE ON public.language_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_lang_subjects_lang ON public.language_subjects(language_id);
CREATE INDEX idx_lang_courses_lang ON public.language_courses(language_id);
CREATE INDEX idx_lang_sessions_lang ON public.language_sessions(language_id);
CREATE INDEX idx_lang_sessions_date ON public.language_sessions(date);