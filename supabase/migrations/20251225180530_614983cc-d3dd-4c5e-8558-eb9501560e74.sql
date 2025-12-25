-- Drop and recreate the quizzes policy with proper enum casting
DROP POLICY IF EXISTS "Anyone can view accessible quizzes" ON public.quizzes;

CREATE POLICY "Anyone can view accessible quizzes" 
ON public.quizzes 
FOR SELECT 
USING (
  (is_public = true) 
  OR (auth.uid() = creator_id)
  OR (EXISTS (
    SELECT 1 FROM public.quiz_sessions 
    WHERE quiz_sessions.quiz_id = quizzes.id 
    AND quiz_sessions.host_id = auth.uid()
    AND quiz_sessions.status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])
  ))
);