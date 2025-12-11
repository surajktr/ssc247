import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cdwikwwpakmlauiddasz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkd2lrd3dwYWttbGF1aWRkYXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE1NjkzNTcsImV4cCI6MjA3NzE0NTM1N30.02KB2EawFjfiUM0i22-v9TfxEkNqEc4YcXqR9C8xRHg';

export const supabase = createClient(supabaseUrl, supabaseKey);