import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase credentials in .env.local.');
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder'
);

export interface EventSession {
  id: string;
  event_name: string;
  event_slug: string;
  created_at: string;
}

export interface PhotoCapture {
  id: string;
  event_slug: string;
  storage_path: string;
  public_url: string;
  template_used: number;
  created_at: string;
}