
-- Add subject_id to learning_path_steps to link steps to subjects for hour tracking
ALTER TABLE public.learning_path_steps
ADD COLUMN subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX idx_learning_path_steps_subject_id ON public.learning_path_steps(subject_id);
