
-- Create status enum for learning path steps
CREATE TYPE public.step_status AS ENUM ('not_started', 'in_progress', 'completed');

-- Learning paths table
CREATE TABLE public.learning_paths (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  estimated_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Learning path steps table
CREATE TABLE public.learning_path_steps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  path_id UUID REFERENCES public.learning_paths(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT DEFAULT NULL,
  status public.step_status NOT NULL DEFAULT 'not_started',
  estimated_hours NUMERIC DEFAULT 0,
  position INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.learning_path_steps ENABLE ROW LEVEL SECURITY;

-- RLS policies for learning_paths
CREATE POLICY "Users can view their own learning paths"
  ON public.learning_paths FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own learning paths"
  ON public.learning_paths FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own learning paths"
  ON public.learning_paths FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own learning paths"
  ON public.learning_paths FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS policies for learning_path_steps (via path ownership)
CREATE POLICY "Users can view steps of their own paths"
  ON public.learning_path_steps FOR SELECT
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_paths WHERE id = path_id AND user_id = auth.uid()));

CREATE POLICY "Users can create steps in their own paths"
  ON public.learning_path_steps FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.learning_paths WHERE id = path_id AND user_id = auth.uid()));

CREATE POLICY "Users can update steps in their own paths"
  ON public.learning_path_steps FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_paths WHERE id = path_id AND user_id = auth.uid()));

CREATE POLICY "Users can delete steps in their own paths"
  ON public.learning_path_steps FOR DELETE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.learning_paths WHERE id = path_id AND user_id = auth.uid()));
