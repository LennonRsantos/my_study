
-- Categories table
CREATE TABLE public.categories (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#6366f1',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own categories" ON public.categories FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own categories" ON public.categories FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own categories" ON public.categories FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Junction table: link categories to subjects, courses, sessions
CREATE TABLE public.category_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  item_id uuid NOT NULL,
  item_type text NOT NULL CHECK (item_type IN ('subject', 'course', 'session')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (category_id, item_id, item_type)
);

ALTER TABLE public.category_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can select own category_items" ON public.category_items FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_items.category_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can insert own category_items" ON public.category_items FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_items.category_id AND c.user_id = auth.uid()));
CREATE POLICY "Users can delete own category_items" ON public.category_items FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.categories c WHERE c.id = category_items.category_id AND c.user_id = auth.uid()));

CREATE INDEX idx_category_items_category ON public.category_items(category_id);
CREATE INDEX idx_category_items_item ON public.category_items(item_id, item_type);
