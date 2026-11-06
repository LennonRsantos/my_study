
ALTER TABLE public.profiles
ADD COLUMN full_name text,
ADD COLUMN date_of_birth date,
ADD COLUMN user_type text DEFAULT 'aluno';

-- Update handle_new_user to store extra fields
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, full_name, date_of_birth, user_type)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email),
    NEW.raw_user_meta_data->>'full_name',
    (NEW.raw_user_meta_data->>'date_of_birth')::date,
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'aluno')
  );
  RETURN NEW;
END;
$$;
