-- ============================================================
-- Scalability Improvements Migration
-- 1. Composite index for fast leaderboard queries
-- 2. max_participants cap on quiz_sessions
-- 3. RLS policy to enforce participant cap on join
-- ============================================================

-- 1. Composite index on quiz_participants for leaderboard ORDER BY
--    Covers: WHERE session_id = X ORDER BY total_score DESC, joined_at ASC
CREATE INDEX IF NOT EXISTS idx_quiz_participants_session_score
  ON public.quiz_participants(session_id, total_score DESC, joined_at ASC);

-- 2. Add max_participants column to quiz_sessions (default 200, max 500)
ALTER TABLE public.quiz_sessions
  ADD COLUMN IF NOT EXISTS max_participants INTEGER NOT NULL DEFAULT 200;

-- 3. Drop and recreate the INSERT policy for quiz_participants
--    to enforce the max_participants cap
DROP POLICY IF EXISTS "Anyone can join as participant" ON public.quiz_participants;

CREATE POLICY "Anyone can join as participant"
  ON public.quiz_participants
  FOR INSERT
  WITH CHECK (
    -- Enforce the participant cap defined on the session
    (
      SELECT COUNT(*)
      FROM public.quiz_participants existing
      WHERE existing.session_id = quiz_participants.session_id
    ) < (
      SELECT max_participants
      FROM public.quiz_sessions
      WHERE id = quiz_participants.session_id
    )
  );
