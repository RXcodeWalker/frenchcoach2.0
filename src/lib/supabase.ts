import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder', {
  auth: { flowType: 'pkce' },
});

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
          migration_version: number;
          avatar_emoji: string | null;
          equipped_frame: string | null;
          equipped_nameplate: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['profiles']['Row'], 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      shop_items: {
        Row: {
          id: string;
          kind: string;
          price_gems: number;
          consumable: boolean;
          max_owned: number | null;
          requirement: Record<string, unknown>;
          emoji: string | null;
          active: boolean;
          sort_order: number;
        };
      };
      gem_events: {
        Row: {
          id: string;
          user_id: string;
          delta: number;
          kind: string;
          item_id: string | null;
          metadata: Record<string, unknown>;
          occurred_at: string;
          created_at: string;
        };
      };
      user_inventory: {
        Row: {
          user_id: string;
          item_id: string;
          qty: number;
          acquired_at: string;
        };
      };
      item_consumptions: {
        Row: {
          id: string;
          user_id: string;
          item_id: string;
          created_at: string;
        };
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
      coach_evidence: {
        Row: {
          id: string;
          user_id: string;
          occurred_at: string;
          source_session_id: string | null;
          evidence_type: string;
          target_node_ids: string[];
          observation: Record<string, unknown>;
          result: Record<string, unknown>;
          reliability: Record<string, unknown>;
          context: Record<string, unknown>;
          schema_version: number;
          created_at: string;
        };
      };
    };
  };
};
