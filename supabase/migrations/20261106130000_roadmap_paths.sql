-- Roadmap paths: a path follows one course, steps nest into topics and sessions point at the step they covered
ALTER TABLE public.learning_paths
  ADD COLUMN course_id uuid REFERENCES public.courses(id) ON DELETE SET NULL;

ALTER TABLE public.learning_path_steps
  ADD COLUMN parent_id uuid REFERENCES public.learning_path_steps(id) ON DELETE CASCADE,
  ADD COLUMN module_id uuid REFERENCES public.course_modules(id) ON DELETE SET NULL,
  ADD COLUMN study_note text NOT NULL DEFAULT '';

ALTER TABLE public.study_sessions
  ADD COLUMN step_id uuid REFERENCES public.learning_path_steps(id) ON DELETE SET NULL;

CREATE INDEX idx_learning_path_steps_parent_id ON public.learning_path_steps(parent_id);
CREATE INDEX idx_study_sessions_step_id ON public.study_sessions(step_id);

NOTIFY pgrst, 'reload schema';
