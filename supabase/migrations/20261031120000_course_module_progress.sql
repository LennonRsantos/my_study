-- Module duration and completion: the course progress bar fills with completed modules' durations
ALTER TABLE public.course_modules
  ADD COLUMN IF NOT EXISTS duration_minutes integer CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  ADD COLUMN IF NOT EXISTS completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;

NOTIFY pgrst, 'reload schema';
