-- Update quizzes policy to allow participants of active sessions to view
DROP POLICY IF EXISTS "Anyone can view accessible quizzes" ON public.quizzes;

CREATE POLICY "Anyone can view accessible quizzes" 
ON public.quizzes 
FOR SELECT 
USING (
  (is_public = true) 
  OR (auth.uid() = creator_id)
  -- Allow hosts of active sessions
  OR (EXISTS (
    SELECT 1 FROM public.quiz_sessions 
    WHERE quiz_sessions.quiz_id = quizzes.id 
    AND quiz_sessions.host_id = auth.uid()
    AND quiz_sessions.status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])
  ))
  -- Allow participants of active sessions to view the quiz
  OR (EXISTS (
    SELECT 1 FROM public.quiz_sessions qs
    JOIN public.quiz_participants qp ON qp.session_id = qs.id
    WHERE qs.quiz_id = quizzes.id 
    AND qs.status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])
    AND (qp.user_id = auth.uid() OR qp.user_id IS NULL)
  ))
);

-- Update questions policy to allow participants of active sessions to view
DROP POLICY IF EXISTS "Anyone can view questions of accessible quizzes" ON public.questions;

CREATE POLICY "Anyone can view questions of accessible quizzes" 
ON public.questions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quizzes
    WHERE quizzes.id = questions.quiz_id 
    AND (
      quizzes.is_public = true 
      OR quizzes.creator_id = auth.uid()
      -- Allow hosts
      OR EXISTS (
        SELECT 1 FROM public.quiz_sessions 
        WHERE quiz_sessions.quiz_id = quizzes.id 
        AND quiz_sessions.host_id = auth.uid()
        AND quiz_sessions.status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])
      )
      -- Allow participants
      OR EXISTS (
        SELECT 1 FROM public.quiz_sessions qs
        JOIN public.quiz_participants qp ON qp.session_id = qs.id
        WHERE qs.quiz_id = quizzes.id 
        AND qs.status = ANY (ARRAY['waiting'::session_status, 'active'::session_status])
        AND (qp.user_id = auth.uid() OR qp.user_id IS NULL)
      )
    )
  )
);