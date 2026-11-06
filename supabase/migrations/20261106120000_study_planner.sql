-- Study planner: per-course / per-language plan settings and confirmed study blocks.
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS plan_deadline date,
  ADD COLUMN IF NOT EXISTS plan_weekly_hours numeric CHECK (plan_weekly_hours IS NULL OR plan_weekly_hours >= 0),
  ADD COLUMN IF NOT EXISTS plan_days smallint[] CHECK (plan_days IS NULL OR plan_days <@ '{1,2,3,4,5,6,7}'),
  ADD COLUMN IF NOT EXISTS plan_priority smallint NOT NULL DEFAULT 1 CHECK (plan_priority BETWEEN 0 AND 2);

ALTER TABLE public.languages
  ADD COLUMN IF NOT EXISTS plan_deadline date,
  ADD COLUMN IF NOT EXISTS plan_weekly_hours numeric CHECK (plan_weekly_hours IS NULL OR plan_weekly_hours >= 0),
  ADD COLUMN IF NOT EXISTS plan_days smallint[] CHECK (plan_days IS NULL OR plan_days <@ '{1,2,3,4,5,6,7}'),
  ADD COLUMN IF NOT EXISTS plan_priority smallint NOT NULL DEFAULT 1 CHECK (plan_priority BETWEEN 0 AND 2);

CREATE TABLE IF NOT EXISTS public.plan_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  language_id uuid REFERENCES public.languages(id) ON DELETE CASCADE,
  date date NOT NULL,
  planned_minutes integer NOT NULL CHECK (planned_minutes BETWEEN 1 AND 1440),
  label text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CHECK (num_nonnulls(course_id, language_id) = 1)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_blocks TO authenticated;
GRANT ALL ON public.plan_blocks TO service_role;

ALTER TABLE public.plan_blocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own plan blocks" ON public.plan_blocks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own plan blocks" ON public.plan_blocks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own plan blocks" ON public.plan_blocks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete their own plan blocks" ON public.plan_blocks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_plan_blocks_user_date ON public.plan_blocks(user_id, date);

NOTIFY pgrst, 'reload schema';
