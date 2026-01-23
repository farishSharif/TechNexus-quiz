-- Add columns for tie-breaking
ALTER TABLE public.quiz_participants 
ADD COLUMN IF NOT EXISTS last_answer_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS total_response_time_ms INTEGER DEFAULT 0;

-- Function to get consistent leaderboard
CREATE OR REPLACE FUNCTION public.get_session_leaderboard(p_session_id UUID)
RETURNS TABLE (
  id UUID,
  session_id UUID,
  user_id UUID,
  nickname TEXT,
  avatar_emoji TEXT,
  total_score INTEGER,
  current_streak INTEGER,
  best_streak INTEGER,
  joined_at TIMESTAMPTZ,
  last_answer_at TIMESTAMPTZ,
  total_response_time_ms INTEGER,
  rank BIGINT
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    session_id,
    user_id,
    nickname,
    avatar_emoji,
    total_score,
    current_streak,
    best_streak,
    joined_at,
    last_answer_at,
    total_response_time_ms,
    RANK() OVER (
      ORDER BY 
        total_score DESC,
        total_response_time_ms ASC,
        last_answer_at ASC,
        id ASC
    ) as rank
  FROM public.quiz_participants
  WHERE session_id = p_session_id
  ORDER BY rank ASC;
$$;
