-- Create frozen_days table to track manually frozen study days with compensation
CREATE TABLE public.frozen_days (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  frozen_date DATE NOT NULL,
  reason TEXT NOT NULL,
  compensation_date DATE NOT NULL,
  compensation_hours NUMERIC NOT NULL DEFAULT 1,
  compensated BOOLEAN NOT NULL DEFAULT false,
  compensated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, frozen_date)
);

ALTER TABLE public.frozen_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own frozen_days"
ON public.frozen_days FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own frozen_days"
ON public.frozen_days FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own frozen_days"
ON public.frozen_days FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own frozen_days"
ON public.frozen_days FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_frozen_days_updated_at
BEFORE UPDATE ON public.frozen_days
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_frozen_days_user_date ON public.frozen_days(user_id, frozen_date);