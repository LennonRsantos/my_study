
-- Add missing UPDATE policy for course_subjects
CREATE POLICY "Users can update own course_subjects"
ON public.course_subjects
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM courses c
  WHERE c.id = course_subjects.course_id AND (c.user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))
));

-- Add missing UPDATE policy for category_items
CREATE POLICY "Users can update own category_items"
ON public.category_items
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM categories c
  WHERE c.id = category_items.category_id AND c.user_id = auth.uid()
));
