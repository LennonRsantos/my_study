
-- Create subjects table
CREATE TABLE public.subjects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#0d9488',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create study sessions table
CREATE TABLE public.study_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  hours NUMERIC NOT NULL DEFAULT 0,
  notes TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create daily goals table (single row)
CREATE TABLE public.daily_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  hours_per_day NUMERIC NOT NULL DEFAULT 4,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_goals ENABLE ROW LEVEL SECURITY;

-- Public access policies for subjects
CREATE POLICY "Anyone can read subjects" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "Anyone can insert subjects" ON public.subjects FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update subjects" ON public.subjects FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete subjects" ON public.subjects FOR DELETE USING (true);

-- Public access policies for study_sessions
CREATE POLICY "Anyone can read sessions" ON public.study_sessions FOR SELECT USING (true);
CREATE POLICY "Anyone can insert sessions" ON public.study_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update sessions" ON public.study_sessions FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete sessions" ON public.study_sessions FOR DELETE USING (true);

-- Public access policies for daily_goals
CREATE POLICY "Anyone can read goals" ON public.daily_goals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert goals" ON public.daily_goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update goals" ON public.daily_goals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete goals" ON public.daily_goals FOR DELETE USING (true);

-- Insert default goal
INSERT INTO public.daily_goals (hours_per_day) VALUES (4);
