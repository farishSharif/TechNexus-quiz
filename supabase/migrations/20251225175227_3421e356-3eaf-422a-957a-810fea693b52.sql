-- Drop existing policies that need updating
DROP POLICY IF EXISTS "Anyone can view public quizzes" ON public.quizzes;
DROP POLICY IF EXISTS "Anyone can view questions of accessible quizzes" ON public.questions;

-- Create updated policy for quizzes: allow public quizzes, creators, AND hosts of active sessions
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
    AND quiz_sessions.status IN ('waiting', 'active')
  ))
);

-- Create updated policy for questions: allow questions for accessible quizzes (including host sessions)
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
      OR EXISTS (
        SELECT 1 FROM public.quiz_sessions 
        WHERE quiz_sessions.quiz_id = quizzes.id 
        AND quiz_sessions.host_id = auth.uid()
        AND quiz_sessions.status IN ('waiting', 'active')
      )
    )
  )
);