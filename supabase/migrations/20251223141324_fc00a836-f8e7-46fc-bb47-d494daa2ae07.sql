-- Create app_role enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- Create quiz_category enum
CREATE TYPE public.quiz_category AS ENUM (
  'art_literature',
  'entertainment',
  'geography',
  'history',
  'science_nature',
  'sports',
  'languages',
  'trivia',
  'technology',
  'other'
);

-- Create question_type enum
CREATE TYPE public.question_type AS ENUM (
  'multiple_choice_single',
  'multiple_choice_multiple',
  'true_false'
);

-- Create session_mode enum
CREATE TYPE public.session_mode AS ENUM ('live_hosted', 'self_paced');

-- Create session_status enum
CREATE TYPE public.session_status AS ENUM ('waiting', 'active', 'completed', 'cancelled');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category quiz_category NOT NULL DEFAULT 'trivia',
  cover_image_url TEXT,
  is_public BOOLEAN NOT NULL DEFAULT false,
  default_time_per_question INTEGER NOT NULL DEFAULT 30,
  play_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  question_text TEXT NOT NULL,
  question_type question_type NOT NULL DEFAULT 'multiple_choice_single',
  image_url TEXT,
  options JSONB NOT NULL DEFAULT '[]',
  correct_answers JSONB NOT NULL DEFAULT '[]',
  points INTEGER NOT NULL DEFAULT 100,
  time_limit INTEGER NOT NULL DEFAULT 30,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz_sessions table
CREATE TABLE public.quiz_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
  host_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  pin_code TEXT NOT NULL UNIQUE,
  mode session_mode NOT NULL DEFAULT 'live_hosted',
  status session_status NOT NULL DEFAULT 'waiting',
  current_question_index INTEGER DEFAULT 0,
  show_leaderboard BOOLEAN NOT NULL DEFAULT true,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz_participants table
CREATE TABLE public.quiz_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  nickname TEXT NOT NULL,
  avatar_emoji TEXT DEFAULT '😀',
  total_score INTEGER NOT NULL DEFAULT 0,
  current_streak INTEGER NOT NULL DEFAULT 0,
  best_streak INTEGER NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create quiz_responses table
CREATE TABLE public.quiz_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID REFERENCES public.quiz_participants(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES public.quiz_sessions(id) ON DELETE CASCADE NOT NULL,
  selected_answers JSONB NOT NULL DEFAULT '[]',
  is_correct BOOLEAN NOT NULL DEFAULT false,
  points_earned INTEGER NOT NULL DEFAULT 0,
  response_time_ms INTEGER,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (participant_id, question_id)
);

-- Enable Row Level Security on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_responses ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'display_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quizzes_updated_at
  BEFORE UPDATE ON public.quizzes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Profiles policies
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles policies (only admins can manage roles)
CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- Quizzes policies
CREATE POLICY "Anyone can view public quizzes" ON public.quizzes
  FOR SELECT USING (is_public = true OR auth.uid() = creator_id);

CREATE POLICY "Authenticated users can create quizzes" ON public.quizzes
  FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their quizzes" ON public.quizzes
  FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their quizzes" ON public.quizzes
  FOR DELETE USING (auth.uid() = creator_id);

-- Questions policies
CREATE POLICY "Anyone can view questions of accessible quizzes" ON public.questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = quiz_id 
      AND (is_public = true OR creator_id = auth.uid())
    )
  );

CREATE POLICY "Quiz creators can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.quizzes 
      WHERE id = quiz_id 
      AND creator_id = auth.uid()
    )
  );

-- Quiz sessions policies
CREATE POLICY "Anyone can view active sessions" ON public.quiz_sessions
  FOR SELECT USING (true);

CREATE POLICY "Authenticated users can create sessions" ON public.quiz_sessions
  FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their sessions" ON public.quiz_sessions
  FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their sessions" ON public.quiz_sessions
  FOR DELETE USING (auth.uid() = host_id);

-- Quiz participants policies
CREATE POLICY "Anyone can view participants in sessions" ON public.quiz_participants
  FOR SELECT USING (true);

CREATE POLICY "Anyone can join as participant" ON public.quiz_participants
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Participants can update their own record" ON public.quiz_participants
  FOR UPDATE USING (user_id = auth.uid() OR user_id IS NULL);

-- Quiz responses policies
CREATE POLICY "Participants can view their responses" ON public.quiz_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.quiz_participants
      WHERE id = participant_id
      AND (user_id = auth.uid() OR user_id IS NULL)
    )
    OR
    EXISTS (
      SELECT 1 FROM public.quiz_sessions
      WHERE id = session_id
      AND host_id = auth.uid()
    )
  );

CREATE POLICY "Participants can submit responses" ON public.quiz_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quiz_participants
      WHERE id = participant_id
    )
  );

-- Create indexes for performance
CREATE INDEX idx_quizzes_creator_id ON public.quizzes(creator_id);
CREATE INDEX idx_quizzes_category ON public.quizzes(category);
CREATE INDEX idx_quizzes_is_public ON public.quizzes(is_public);
CREATE INDEX idx_questions_quiz_id ON public.questions(quiz_id);
CREATE INDEX idx_quiz_sessions_pin_code ON public.quiz_sessions(pin_code);
CREATE INDEX idx_quiz_sessions_quiz_id ON public.quiz_sessions(quiz_id);
CREATE INDEX idx_quiz_participants_session_id ON public.quiz_participants(session_id);
CREATE INDEX idx_quiz_responses_participant_id ON public.quiz_responses(participant_id);
CREATE INDEX idx_quiz_responses_session_id ON public.quiz_responses(session_id);

-- Enable realtime for live quiz features
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.quiz_responses;