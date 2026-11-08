-- Smart planner: fatigue limits, missed/done blocks and spaced review blocks.
ALTER TABLE public.daily_goals
  ADD COLUMN IF NOT EXISTS plan_daily_limit_hours numeric CHECK (plan_daily_limit_hours IS NULL OR (plan_daily_limit_hours > 0 AND plan_daily_limit_hours <= 24)),
  ADD COLUMN IF NOT EXISTS plan_max_block_minutes integer NOT NULL DEFAULT 90 CHECK (plan_max_block_minutes BETWEEN 15 AND 600);

ALTER TABLE public.plan_blocks
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'missed', 'done')),
  ADD COLUMN IF NOT EXISTS block_type text NOT NULL DEFAULT 'study' CHECK (block_type IN ('study', 'review')),
  ADD COLUMN IF NOT EXISTS module_id uuid REFERENCES public.course_modules(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS review_step smallint CHECK (review_step IS NULL OR review_step BETWEEN 1 AND 3);

-- One review per step for each module (or for the whole course when module_id is null).
CREATE UNIQUE INDEX IF NOT EXISTS uq_plan_blocks_review
  ON public.plan_blocks (user_id, course_id, module_id, review_step) NULLS NOT DISTINCT
  WHERE block_type = 'review';

NOTIFY pgrst, 'reload schema';
