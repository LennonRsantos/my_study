-- Submodule (section) a lesson belongs to, e.g. "1.1. O mundo da segurança cibernética". Null: lesson sits directly in the module.
ALTER TABLE public.course_lessons ADD COLUMN IF NOT EXISTS section text;

NOTIFY pgrst, 'reload schema';
