import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://bhaqiizhzwrfxfblubbs.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJoYXFpaXpoendyZnhmYmx1YmJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzNTc1NzksImV4cCI6MjEwODkzMzU3OX0.CZ4zAG23_F5_13Y-evEwOvBlh4Arhvfv8QT14h9xdhw';
export const FUNCTIONS_URL = `${supabaseUrl}/functions/v1`;

export const supabase = createClient(supabaseUrl, SUPABASE_ANON_KEY);
