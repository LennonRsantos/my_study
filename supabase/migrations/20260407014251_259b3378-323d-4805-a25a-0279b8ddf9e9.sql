
ALTER TABLE public.categories
ADD COLUMN context text NOT NULL DEFAULT 'subject';

-- Add index for faster filtering
CREATE INDEX idx_categories_context ON public.categories (user_id, context);
