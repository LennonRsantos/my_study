-- Optional icon (emoji or devicon name) per learning path, like subjects and steps.
ALTER TABLE public.learning_paths ADD COLUMN IF NOT EXISTS icon text;
