import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY);
