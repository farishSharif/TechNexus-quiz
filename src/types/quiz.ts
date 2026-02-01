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

export const CHARACTER_IMAGES: Record<string, string> = {
  "Tanjiro Kamado": "https://cdn.myanimelist.net/images/characters/6/386735.webp",
  "Nezuko Kamado": "https://cdn.myanimelist.net/images/characters/2/378254.webp",
  "Zenitsu Agatsuma": "https://cdn.myanimelist.net/images/characters/10/459689.webp",
  "Inosuke Hashibira": "https://cdn.myanimelist.net/images/characters/3/329560.webp",
  "Giyu Tomioka": "https://cdn.myanimelist.net/images/characters/3/423445.webp",
  "Kyojuro Rengoku": "https://cdn.myanimelist.net/images/characters/2/377344.webp",
  "Shinobu Kocho": "https://cdn.myanimelist.net/images/characters/3/386591.webp",
  "Tengen Uzui": "https://cdn.myanimelist.net/images/characters/16/387706.webp",
  "Mitsuri Kanroji": "https://cdn.myanimelist.net/images/characters/11/514229.webp",
  "Muichiro Tokito": "https://cdn.myanimelist.net/images/characters/5/464903.webp",
  "Sanemi Shinazugawa": "https://cdn.myanimelist.net/images/characters/11/556642.webp",
  "Gyomei Himejima": "https://cdn.myanimelist.net/images/characters/10/550017.webp",
  "Obanai Iguro": "https://cdn.myanimelist.net/images/characters/15/466014.webp",
  "Kanao Tsuyuri": "https://cdn.myanimelist.net/images/characters/2/384712.webp",
  "Genya Shinazugawa": "https://cdn.myanimelist.net/images/characters/5/390152.webp",
  "Muzan Kibutsuji": "https://cdn.myanimelist.net/images/characters/4/384669.webp",
  "Akaza": "https://cdn.myanimelist.net/images/characters/2/464775.webp",
  "Doma": "https://cdn.myanimelist.net/images/characters/7/396103.webp",
  "Kokushibo": "https://cdn.myanimelist.net/images/characters/10/406156.webp",
  "Yuji Itadori": "https://cdn.myanimelist.net/images/characters/6/467646.webp",
  "Megumi Fushiguro": "https://cdn.myanimelist.net/images/characters/2/392689.webp",
  "Nobara Kugisaki": "https://cdn.myanimelist.net/images/characters/12/422313.webp",
  "Satoru Gojo": "https://cdn.myanimelist.net/images/characters/15/422168.webp",
  "Maki Zenin": "https://cdn.myanimelist.net/images/characters/15/423949.webp",
  "Toge Inumaki": "https://cdn.myanimelist.net/images/characters/4/521636.webp",
  "Panda": "https://cdn.myanimelist.net/images/characters/15/609267.webp",
  "Yuta Okkotsu": "https://cdn.myanimelist.net/images/characters/10/612174.webp",
  "Nanami Kento": "https://cdn.myanimelist.net/images/characters/16/581424.webp",
  "Sukuna": "https://cdn.myanimelist.net/images/characters/14/572709.webp",
  "Mahito": "https://cdn.myanimelist.net/images/characters/5/446508.webp",
  "Geto Suguru": "https://cdn.myanimelist.net/images/characters/13/611642.webp",
  "Toji Fushiguro": "https://cdn.myanimelist.net/images/characters/2/517123.webp",
  "Goku": "https://cdn.myanimelist.net/images/characters/14/401183.webp",
  "Vegeta": "https://cdn.myanimelist.net/images/characters/14/86185.webp",
  "Gohan": "https://cdn.myanimelist.net/images/characters/9/446314.webp",
  "Piccolo": "https://cdn.myanimelist.net/images/characters/8/45628.webp",
  "Trunks": "https://cdn.myanimelist.net/images/characters/5/312402.webp",
  "Frieza": "https://cdn.myanimelist.net/images/characters/16/561778.webp",
  "Cell": "https://cdn.myanimelist.net/images/characters/9/435129.webp",
  "Majin Buu": "https://cdn.myanimelist.net/images/characters/6/94545.webp",
  "Beerus": "https://cdn.myanimelist.net/images/characters/12/348954.webp",
  "Broly": "https://cdn.myanimelist.net/images/characters/2/275050.webp",
  "Android 18": "https://cdn.myanimelist.net/images/characters/5/537661.webp",
  "Bulma": "https://cdn.myanimelist.net/images/characters/14/280893.webp",
  "Eren Yeager": "https://cdn.myanimelist.net/images/characters/10/216895.webp",
  "Mikasa Ackerman": "https://cdn.myanimelist.net/images/characters/9/215563.webp",
  "Armin Arlert": "https://cdn.myanimelist.net/images/characters/8/220267.webp",
  "Levi Ackerman": "https://cdn.myanimelist.net/images/characters/4/615306.webp",
  "Erwin Smith": "https://cdn.myanimelist.net/images/characters/14/559023.webp",
  "Hange Zoe": "https://cdn.myanimelist.net/images/characters/15/208637.webp",
  "Reiner Braun": "https://cdn.myanimelist.net/images/characters/16/206489.webp",
  "Annie Leonhart": "https://cdn.myanimelist.net/images/characters/9/206357.webp",
  "Zeke Yeager": "https://cdn.myanimelist.net/images/characters/12/602645.webp",
  "Naruto Uzumaki": "https://cdn.myanimelist.net/images/characters/9/131317.webp",
  "Sasuke Uchiha": "https://cdn.myanimelist.net/images/characters/9/131311.webp",
  "Kakashi Hatake": "https://cdn.myanimelist.net/images/characters/7/284129.webp",
  "Itachi Uchiha": "https://cdn.myanimelist.net/images/characters/2/115165.webp",
  "Luffy": "https://cdn.myanimelist.net/images/characters/9/310307.webp",
  "Zoro": "https://cdn.myanimelist.net/images/characters/3/100534.webp",
  "Nami": "https://cdn.myanimelist.net/images/characters/2/263249.webp",
  "Sanji": "https://cdn.myanimelist.net/images/characters/5/133549.webp",
  "Sung Jin-Woo": "https://cdn.myanimelist.net/images/characters/6/533318.webp",
  "Ichigo Kurosaki": "https://cdn.myanimelist.net/images/characters/10/117369.webp",
  "Rukia Kuchiki": "https://cdn.myanimelist.net/images/characters/3/113331.webp",
  "Saitama": "https://cdn.myanimelist.net/images/characters/11/294350.webp",
  "Genos": "https://cdn.myanimelist.net/images/characters/2/294247.webp",
  "Rimuru Tempest": "https://cdn.myanimelist.net/images/characters/10/371661.webp"
};

export const AVATAR_EMOJIS = Object.keys(CHARACTER_IMAGES);
