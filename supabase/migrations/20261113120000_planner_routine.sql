-- Planner routine: item status (pending / in progress / completed), learning paths in the planner,
-- and the user's available weekdays.

ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed'));
UPDATE public.courses SET status = 'completed' WHERE completed AND status <> 'completed';

ALTER TABLE public.languages
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed'));

ALTER TABLE public.learning_paths
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('pending', 'in_progress', 'completed')),
  ADD COLUMN IF NOT EXISTS plan_deadline date,
  ADD COLUMN IF NOT EXISTS plan_weekly_hours numeric CHECK (plan_weekly_hours IS NULL OR plan_weekly_hours >= 0),
  ADD COLUMN IF NOT EXISTS plan_days smallint[] CHECK (plan_days IS NULL OR plan_days <@ '{1,2,3,4,5,6,7}'),
  ADD COLUMN IF NOT EXISTS plan_priority smallint NOT NULL DEFAULT 1 CHECK (plan_priority BETWEEN 0 AND 2);

ALTER TABLE public.daily_goals
  ADD COLUMN IF NOT EXISTS plan_days smallint[] CHECK (plan_days IS NULL OR plan_days <@ '{1,2,3,4,5,6,7}');

-- Keeps courses.completed (used across the app) and courses.status in step, whichever one a write changes.
CREATE OR REPLACE FUNCTION public.sync_course_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.completed := NEW.status = 'completed';
  ELSIF TG_OP = 'UPDATE' AND NEW.completed IS DISTINCT FROM OLD.completed THEN
    NEW.status := CASE WHEN NEW.completed THEN 'completed' ELSE 'in_progress' END;
  ELSIF TG_OP = 'INSERT' THEN
    IF NEW.completed THEN NEW.status := 'completed';
    ELSIF NEW.status = 'completed' THEN NEW.completed := true;
    END IF;
  END IF;
  IF NEW.completed AND NEW.completed_at IS NULL THEN NEW.completed_at := now(); END IF;
  IF NOT NEW.completed THEN NEW.completed_at := NULL; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_course_status ON public.courses;
CREATE TRIGGER trg_sync_course_status
  BEFORE INSERT OR UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.sync_course_status();

ALTER TABLE public.plan_blocks
  ADD COLUMN IF NOT EXISTS path_id uuid REFERENCES public.learning_paths(id) ON DELETE CASCADE;
-- Drop the old "one of course/language" check whatever its generated name.
DO $$
DECLARE c record;
BEGIN
  FOR c IN
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'public.plan_blocks'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) LIKE '%num_nonnulls%'
  LOOP
    EXECUTE format('ALTER TABLE public.plan_blocks DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;
ALTER TABLE public.plan_blocks
  ADD CONSTRAINT plan_blocks_one_item CHECK (num_nonnulls(course_id, language_id, path_id) = 1);

NOTIFY pgrst, 'reload schema';
