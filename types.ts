
export interface BlogPost {
  id: string;
  title: string;
  date: string;
  icon: string;
  iconBgColor: string;
  isRead: boolean;
  htmlContent?: string;
  styles?: string; // Added to store scoped CSS
}

export interface Category {
  id: string;
  label: string;
  iconType: 'text' | 'svg';
  iconContent: string;
  gradientClass: string;
  shadowClass: string;
}

export interface QuizOption {
  label: string;
  text_en: string;
  text_hi: string;
}

export interface QuizQuestion {
  id: number;
  question_en: string;
  question_hi: string;
  options: QuizOption[];
  answer: string; // "A", "B", "C", "D"
  explanation_en?: string;
  explanation_hi?: string;
  // Legacy support fields (optional)
  solution_en?: string;
  solution_hi?: string;
  extra_details?: string;
  image_prompt?: string;
}

export interface QuizContent {
  title: string;
  description: string;
  questions: QuizQuestion[];
}

export interface CurrentAffairEntry {
  id: string;
  upload_date: string;
  questions: QuizContent; // Updated to match new root object structure
}

// New Types for Vocab Questions Table
export interface VocabQuestionRaw {
  id: number;
  question: string;
  options: Record<string, string>; // e.g., { "A": "...", "B": "..." }
  answer: string;
  solution: string;
}

export interface VocabEntry {
  id: string;
  upload_date: string;
  syno_questions?: VocabQuestionRaw[] | null;
  antonyms_questions?: VocabQuestionRaw[] | null;
  idioms_questions?: VocabQuestionRaw[] | null;
  ows_questions?: VocabQuestionRaw[] | null;
  news_vocabulary_questions?: VocabQuestionRaw[] | null;
}

export interface QuestionStatus {
  selectedOption: string | null; // Stores "A", "B", etc.
  isMarkedForReview: boolean;
  isVisited: boolean;
  timeSpent: number;
}

export interface QuizResult {
  score: number;
  total: number;
  questionStats: Record<number, QuestionStatus>;
  timestamp: number;
  timeTakenSeconds: number;
}

export interface QuizProgress {
  entryId: string;
  questionStats: Record<number, QuestionStatus>;
  timeRemaining: number;
  currentQuestionIndex: number;
  timestamp: number;
}