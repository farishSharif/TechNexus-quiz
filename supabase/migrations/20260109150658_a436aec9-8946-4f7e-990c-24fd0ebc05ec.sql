-- Create table for admin-only quiz completion records
CREATE TABLE public.quiz_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id uuid NOT NULL,
  quiz_title text NOT NULL,
  session_id uuid NOT NULL,
  host_id uuid NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  participant_count integer NOT NULL DEFAULT 0,
  leaderboard jsonb NOT NULL DEFAULT '[]'::jsonb
);

-- Enable RLS
ALTER TABLE public.quiz_completions ENABLE ROW LEVEL SECURITY;

-- Only admins can view quiz completions
CREATE POLICY "Admins can view all quiz completions"
ON public.quiz_completions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Authenticated users can insert (host saves completion)
CREATE POLICY "Authenticated users can insert quiz completions"
ON public.quiz_completions
FOR INSERT
WITH CHECK (auth.uid() = host_id);

-- Authenticated users can delete their own completions (for cleanup)
CREATE POLICY "Hosts can delete their quiz completions"
ON public.quiz_completions
FOR DELETE
USING (auth.uid() = host_id);

-- Create index for faster lookups
CREATE INDEX idx_quiz_completions_quiz_id ON public.quiz_completions(quiz_id);
CREATE INDEX idx_quiz_completions_completed_at ON public.quiz_completions(completed_at DESC);