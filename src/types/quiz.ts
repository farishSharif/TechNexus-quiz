export type QuizCategory = 
  | 'art_literature'
  | 'entertainment'
  | 'geography'
  | 'history'
  | 'science_nature'
  | 'sports'
  | 'languages'
  | 'trivia'
  | 'technology'
  | 'other';

export type QuestionType = 
  | 'multiple_choice_single'
  | 'multiple_choice_multiple'
  | 'true_false';

export type SessionMode = 'live_hosted' | 'self_paced';

export type SessionStatus = 'waiting' | 'active' | 'completed' | 'cancelled';

export interface Quiz {
  id: string;
  creator_id: string;
  title: string;
  description: string | null;
  category: QuizCategory;
  cover_image_url: string | null;
  is_public: boolean;
  default_time_per_question: number;
  play_count: number;
  created_at: string;
  updated_at: string;
}

export interface Question {
  id: string;
  quiz_id: string;
  question_text: string;
  question_type: QuestionType;
  image_url: string | null;
  options: string[];
  correct_answers: string[];
  points: number;
  time_limit: number;
  order_index: number;
  created_at: string;
}

export interface QuizSession {
  id: string;
  quiz_id: string;
  host_id: string;
  pin_code: string;
  mode: SessionMode;
  status: SessionStatus;
  current_question_index: number;
  show_leaderboard: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

export interface QuizParticipant {
  id: string;
  session_id: string;
  user_id: string | null;
  nickname: string;
  avatar_emoji: string;
  total_score: number;
  current_streak: number;
  best_streak: number;
  joined_at: string;
  last_answer_at?: string;
  total_response_time_ms?: number;
  rank?: number;
}

export interface QuizResponse {
  id: string;
  participant_id: string;
  question_id: string;
  session_id: string;
  selected_answers: string[];
  is_correct: boolean;
  points_earned: number;
  response_time_ms: number | null;
  answered_at: string;
}

export const CATEGORY_LABELS: Record<QuizCategory, string> = {
  art_literature: 'Art & Literature',
  entertainment: 'Entertainment',
  geography: 'Geography',
  history: 'History',
  science_nature: 'Science & Nature',
  sports: 'Sports',
  languages: 'Languages',
  trivia: 'Trivia',
  technology: 'Technology',
  other: 'Other'
};

export const CATEGORY_ICONS: Record<QuizCategory, string> = {
  art_literature: '🎨',
  entertainment: '🎬',
  geography: '🌍',
  history: '📜',
  science_nature: '🔬',
  sports: '⚽',
  languages: '🗣️',
  trivia: '❓',
  technology: '💻',
  other: '📦'
};

export const AVATAR_EMOJIS = [
  '😀', '😎', '🤓', '🧠', '🦊', '🐱', '🐶', '🦁', 
  '🐯', '🐻', '🐼', '🐨', '🐸', '🦄', '🐲', '🦋',
  '🌟', '⚡', '🔥', '💎', '🎯', '🚀', '🎮', '🎪'
];
