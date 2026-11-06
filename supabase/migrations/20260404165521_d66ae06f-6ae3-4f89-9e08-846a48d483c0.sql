
CREATE TABLE public.goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  target_hours NUMERIC NOT NULL DEFAULT 0,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  period TEXT NOT NULL CHECK (period IN ('week', 'month', 'quarter', 'semester', 'year')),
  reward TEXT DEFAULT '',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read goals" ON public.goals FOR SELECT USING (true);
CREATE POLICY "Anyone can insert goals" ON public.goals FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update goals" ON public.goals FOR UPDATE USING (true);
CREATE POLICY "Anyone can delete goals" ON public.goals FOR DELETE USING (true);
