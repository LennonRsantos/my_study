-- Add parent_id to categories to support hierarchy (main category + subcategories)
ALTER TABLE public.categories
ADD COLUMN parent_id uuid NULL REFERENCES public.categories(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);