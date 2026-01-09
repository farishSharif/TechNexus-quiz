-- Allow hosts to view their own quiz completions (for Dashboard leaderboard button)
CREATE POLICY "Hosts can view their own quiz completions"
ON public.quiz_completions
FOR SELECT
USING (auth.uid() = host_id);