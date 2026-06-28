import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder');

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string | null;
          total_xp: number;
          current_level: string;
          streak_days: number;
          longest_streak: number;
          last_session_date: string | null;
          sessions_count: number;
          total_words_spoken: number;
          gems: number;
          achievements: string[];
          inventory: Record<string, number>;
          active_boosters: { id: string; expiresAt: string; multiplier: number }[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      sessions: {
        Row: {
          id: string;
          user_id: string;
          mode: string;
          topic_key: string | null;
          question_text: string | null;
          transcript: string | null;
          word_count: number;
          score: number;
          xp_earned: number;
          duration_sec: number;
          feedback: Record<string, unknown> | null;
          created_at: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          achievement_name: string;
          achieved_at: string;
        };
      };
      skill_snapshots: {
        Row: {
          id: string;
          user_id: string;
          grammar_score: number;
          vocabulary_score: number;
          fluency_score: number;
          communication_score: number;
          overall_score: number;
          recorded_at: string;
        };
      };
    };
  };
};
