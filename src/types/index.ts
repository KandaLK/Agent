export interface User {
  uuid: string;
  username: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    language: 'en' | 'si';
    webSearchEnabled: boolean;
    languageChanged: boolean;
  };
}

export interface ChatThread {
  thread_id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  message_id: string;
  thread_id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  reactions: {
    likes: number;
    dislikes: number;
    userReaction: 'like' | 'dislike' | null;
  };
  isEditing?: boolean;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
}

export interface TypingIndicator {
  role: 'user' | 'assistant';
}

export interface ProcessingState {
  isProcessing: boolean;
  countdown: number;
  randomWord: string;
}